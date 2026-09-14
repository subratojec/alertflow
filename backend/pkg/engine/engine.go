package engine

import (
	"fmt"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/dispatch"
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

	var convertRoute func(r *config.Route, prefix string, idx int) *RouteNode
	convertRoute = func(r *config.Route, prefix string, idx int) *RouteNode {
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

		for i, child := range r.Routes {
			node.Children = append(node.Children, convertRoute(child, id, i+1))
		}

		return node
	}

	return convertRoute(cfg.Route, "", 0), nil
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

	lbls := make(model.LabelSet)
	for k, v := range req.Alert {
		lbls[model.LabelName(k)] = model.LabelValue(v)
	}

	// Convert the config.Route into a dispatch.Route which implements the matching logic.
	route := dispatch.NewRoute(cfg.Route, nil)

	var matches []RouteMatch
	var receivers []string

	var walk func(r *dispatch.Route, id string) (bool, bool)
	walk = func(r *dispatch.Route, id string) (bool, bool) {
		if !r.Matchers.Matches(lbls) {
			return false, false
		}

		childMatched := false
		for i, child := range r.Routes {
			cMatch, _ := walk(child, childID(id, i+1))
			if cMatch {
				childMatched = true
				if !child.Continue {
					break // First match wins if not continue
				}
			}
		}

		terminal := !childMatched
		if terminal {
			receivers = append(receivers, r.RouteOpts.Receiver)
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

	// Reverse the matches list because it was populated post-order
	for i := 0; i < len(matches)/2; i++ {
		j := len(matches) - i - 1
		matches[i], matches[j] = matches[j], matches[i]
	}

	// Deduplicate receivers just in case
	uniqueReceivers := make(map[string]bool)
	var finalReceivers []string
	for _, rec := range receivers {
		if !uniqueReceivers[rec] {
			uniqueReceivers[rec] = true
			finalReceivers = append(finalReceivers, rec)
		}
	}

	explanation := ""
	for i, m := range matches {
		if i > 0 {
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
	}

	return &SimulateResponse{
		MatchedRoutes:     matches,
		ReceiversNotified: finalReceivers,
		Explanation:       explanation,
	}, nil
}
