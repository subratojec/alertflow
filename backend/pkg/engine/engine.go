package engine

import (
	"fmt"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/alertmanager/timeinterval"
	"github.com/prometheus/common/model"
)

// Engine parses configs and runs simulations.
type Engine struct{}

// NewEngine creates a new Engine.
func NewEngine() *Engine {
	return &Engine{}
}

// Validate parses the YAML content and checks for errors and warnings.
func (e *Engine) Validate(yamlContent string) (*ValidateResponse, error) {
	cfg, err := config.Load(yamlContent)
	res := &ValidateResponse{
		Valid:    err == nil,
		Errors:   []Message{},
		Warnings: []Message{},
	}
	if err != nil {
		res.Errors = append(res.Errors, Message{Message: err.Error()})
		return res, nil
	}

	receiverNames := make(map[string]bool)
	for _, r := range cfg.Receivers {
		receiverNames[r.Name] = true
	}

	usedReceivers := make(map[string]bool)
	var walkRoute func(r *config.Route)
	walkRoute = func(r *config.Route) {
		if r.Receiver != "" {
			usedReceivers[r.Receiver] = true
			if !receiverNames[r.Receiver] {
				res.Warnings = append(res.Warnings, Message{Message: fmt.Sprintf("Route references receiver '%s' which doesn't exist", r.Receiver)})
			}
		}
		for _, child := range r.Routes {
			walkRoute(child)
		}
	}

	if cfg.Route != nil {
		walkRoute(cfg.Route)
	} else {
		res.Warnings = append(res.Warnings, Message{Message: "Missing default route"})
	}

	for name := range receiverNames {
		if !usedReceivers[name] {
			res.Warnings = append(res.Warnings, Message{Message: fmt.Sprintf("Receiver '%s' is defined but never used", name)})
		}
	}

	return res, nil
}

// childID consistently generates node IDs for routing subtrees
func childID(parentID string, idx int) string {
	if parentID == "" {
		return "root"
	}
	return fmt.Sprintf("%s-%d", parentID, idx)
}

// effectiveMatchers converts a route's legacy Match/MatchRE fields and its
// new-style Matchers into one unified, displayable set.
func effectiveMatchers(r *config.Route) []string {
	out := []string{}
	for _, m := range r.Matchers {
		out = append(out, m.String())
	}
	for k, v := range r.Match {
		out = append(out, fmt.Sprintf("%s=%q", k, v))
	}
	for k, v := range r.MatchRE {
		out = append(out, fmt.Sprintf("%s=~%q", k, v.String()))
	}
	return out
}

// BuildTree converts the alertmanager config to a serializable tree structure.
func (e *Engine) BuildTree(yamlContent string) (*RouteNode, error) {
	cfg, err := config.Load(yamlContent)
	if err != nil {
		return nil, err
	}

	if cfg.Route == nil {
		return nil, fmt.Errorf("no root route defined")
	}

	var convertRoute func(r *config.Route, prefix string, idx int, inheritedReceiver string) *RouteNode
	convertRoute = func(r *config.Route, prefix string, idx int, inheritedReceiver string) *RouteNode {
		id := childID(prefix, idx)

		matchers := effectiveMatchers(r)

		groupby := []string{}
		for _, lbl := range r.GroupByStr {
			groupby = append(groupby, lbl)
		}

		node := &RouteNode{
			ID:                  id,
			Matchers:            matchers,
			Receiver:            r.Receiver,
			InheritedReceiver:   inheritedReceiver,
			Continue:            r.Continue,
			GroupBy:             groupby,
			GroupByAll:          r.GroupByAll,
			MuteTimeIntervals:   r.MuteTimeIntervals,
			ActiveTimeIntervals: r.ActiveTimeIntervals,
			Children:            make([]*RouteNode, 0, len(r.Routes)),
		}

		// Handle pointers carefully
		if r.GroupWait != nil {
			node.GroupWait = r.GroupWait.String()
		}
		if r.GroupInterval != nil {
			node.GroupInterval = r.GroupInterval.String()
		}
		if r.RepeatInterval != nil {
			node.RepeatInterval = r.RepeatInterval.String()
		}

		nextInherited := r.Receiver
		if nextInherited == "" {
			nextInherited = inheritedReceiver
		}

		for i, child := range r.Routes {
			node.Children = append(node.Children, convertRoute(child, id, i+1, nextInherited))
		}

		return node
	}

	return convertRoute(cfg.Route, "", 0, ""), nil
}



// Simulate runs an alert through the route tree to determine matching receivers.
func (e *Engine) Simulate(req SimulateRequest) (*SimulateResponse, error) {
	cfg, err := config.Load(req.Config)
	if err != nil {
		return nil, err
	}
	if cfg.Route == nil {
		return nil, fmt.Errorf("no root route defined in config")
	}

	simTime := time.Now()
	if req.Time != "" {
		t, err := time.Parse(time.RFC3339, req.Time)
		if err == nil {
			simTime = t
		}
	}

	var alertSets []model.LabelSet
	for _, a := range req.Alerts {
		lbls := make(model.LabelSet)
		for k, v := range a {
			lbls[model.LabelName(k)] = model.LabelValue(v)
		}
		alertSets = append(alertSets, lbls)
	}

	inhibited := make([]bool, len(alertSets))
	inhibitedBy := make([]string, len(alertSets))

	for i, target := range alertSets {
		for j, source := range alertSets {
			if i == j {
				continue
			}
			for _, rule := range cfg.InhibitRules {
				if !labels.Matchers(rule.SourceMatchers).Matches(source) {
					continue
				}
				if !labels.Matchers(rule.TargetMatchers).Matches(target) {
					continue
				}
				equal := true
				for _, ln := range rule.Equal {
					if source[model.LabelName(ln)] != target[model.LabelName(ln)] {
						equal = false
						break
					}
				}
				if equal {
					inhibited[i] = true
					inhibitedBy[i] = fmt.Sprintf("Alert %d", j+1)
					break
				}
			}
			if inhibited[i] {
				break
			}
		}
	}

	route := dispatch.NewRoute(cfg.Route, nil)

	timeIntervals := make(map[string][]timeinterval.TimeInterval)
	for _, ti := range cfg.TimeIntervals {
		timeIntervals[ti.Name] = ti.TimeIntervals
	}

	var results []AlertSimulationResult

	for i, lbls := range alertSets {
		var matches []RouteMatch
		var receivers []string
		muted := false
		var mutedBy []string

		var walk func(r *dispatch.Route, id string) (bool, bool)
		walk = func(r *dispatch.Route, id string) (bool, bool) {
			if !r.Matchers.Matches(lbls) {
				return false, false
			}

			childMatched := false
			for j, child := range r.Routes {
				cMatch, _ := walk(child, childID(id, j+1))
				if cMatch {
					childMatched = true
					if !child.Continue {
						break
					}
				}
			}

			terminal := !childMatched
			if terminal {
				receivers = append(receivers, r.RouteOpts.Receiver)
				
				for _, muteName := range r.RouteOpts.MuteTimeIntervals {
					if intervals, ok := timeIntervals[muteName]; ok {
						for _, interval := range intervals {
							if interval.ContainsTime(simTime) {
								muted = true
								mutedBy = append(mutedBy, muteName)
								break
							}
						}
					}
				}
			}

			matches = append(matches, RouteMatch{
				RouteID:  id,
				Matched:  true,
				Continue: r.Continue,
				Terminal: terminal,
			})

			return true, terminal
		}

		walk(route, "root")

		for k := 0; k < len(matches)/2; k++ {
			j := len(matches) - k - 1
			matches[k], matches[j] = matches[j], matches[k]
		}

		uniqueReceivers := make(map[string]bool)
		var finalReceivers []string
		for _, rec := range receivers {
			if !uniqueReceivers[rec] {
				uniqueReceivers[rec] = true
				finalReceivers = append(finalReceivers, rec)
			}
		}
		
		if inhibited[i] || muted {
			finalReceivers = []string{}
		}

		explanation := ""
		for k, m := range matches {
			if k > 0 {
				explanation += " -> "
			}
			term := ""
			if m.Terminal {
				term = " (terminal)"
			}
			explanation += fmt.Sprintf("%s%s", m.RouteID, term)
		}
		if len(finalReceivers) > 0 {
			explanation += fmt.Sprintf(". Notified: %v", finalReceivers)
		} else if inhibited[i] {
			explanation += fmt.Sprintf(". Suppressed by Inhibit Rule (Source: %s)", inhibitedBy[i])
		} else if muted {
			explanation += fmt.Sprintf(". Suppressed by Time Mute: %v", mutedBy)
		}

		results = append(results, AlertSimulationResult{
			Labels:            req.Alerts[i],
			MatchedRoutes:     matches,
			ReceiversNotified: finalReceivers,
			Inhibited:         inhibited[i],
			InhibitedBy:       inhibitedBy[i],
			Muted:             muted,
			MutedBy:           mutedBy,
			Explanation:       explanation,
		})
	}

	return &SimulateResponse{
		Results: results,
	}, nil
}
