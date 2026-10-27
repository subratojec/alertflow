package engine

import (
	"fmt"
	"regexp"
	"strings"
)

var nonAlphaNumRegex = regexp.MustCompile(`[^a-zA-Z0-9_]`)

// sanitizeMermaidID converts a string into a safe identifier for Mermaid nodes.
func sanitizeMermaidID(id string) string {
	if id == "" {
		return "root"
	}
	return nonAlphaNumRegex.ReplaceAllString(id, "_")
}

// escapeMermaid escapes characters that have special meaning in Mermaid node labels.
func escapeMermaid(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "\"", "#quot;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\r\n", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	return s
}

// formatEdgeMatchers formats matchers for edge condition labels in Mermaid.
func formatEdgeMatchers(matchers []string) string {
	if len(matchers) == 0 {
		return "catch-all"
	}
	escaped := make([]string, len(matchers))
	for i, m := range matchers {
		escaped[i] = escapeMermaid(m)
	}
	return strings.Join(escaped, "<br/>")
}

// ToMermaid generates a rich, architecture-level Mermaid flowchart (flowchart TD).
// - Decision match conditions are displayed on the branching edges.
// - Receivers are displayed as distinct, styled destination endpoints.
// - Fallback receivers and continue directives are explicitly labeled.
func (e *Engine) ToMermaid(root *RouteNode) string {
	if root == nil {
		return ""
	}

	var nodes []string
	var edges []string
	receiverNodes := make(map[string]string)

	getReceiverID := func(name string) string {
		return fmt.Sprintf("rec_%s", sanitizeMermaidID(name))
	}

	var traverse func(node *RouteNode)
	traverse = func(node *RouteNode) {
		sID := sanitizeMermaidID(node.ID)
		isRoot := node.ID == "root"

		var labelLines []string
		if isRoot {
			labelLines = append(labelLines, "<b>ROOT ROUTE</b>")
			if node.Receiver != "" {
				labelLines = append(labelLines, fmt.Sprintf("<i>Default: %s</i>", escapeMermaid(node.Receiver)))
			}
		} else {
			title := fmt.Sprintf("<b>ROUTE (%s)</b>", escapeMermaid(node.ID))
			if node.Continue {
				title += " <span style=\"#quot;color:#D4A24C;#quot;\">[CONTINUE]</span>"
			}
			labelLines = append(labelLines, title)
		}

		if node.GroupByAll {
			labelLines = append(labelLines, "Group by: [ALL]")
		} else if len(node.GroupBy) > 0 {
			labelLines = append(labelLines, fmt.Sprintf("Group by: [%s]", escapeMermaid(strings.Join(node.GroupBy, ", "))))
		}

		var timings []string
		if node.GroupWait != "" {
			timings = append(timings, fmt.Sprintf("Wait: %s", escapeMermaid(node.GroupWait)))
		}
		if node.GroupInterval != "" {
			timings = append(timings, fmt.Sprintf("Interval: %s", escapeMermaid(node.GroupInterval)))
		}
		if node.RepeatInterval != "" {
			timings = append(timings, fmt.Sprintf("Repeat: %s", escapeMermaid(node.RepeatInterval)))
		}
		if len(timings) > 0 {
			labelLines = append(labelLines, strings.Join(timings, " | "))
		}

		if len(node.MuteTimeIntervals) > 0 {
			labelLines = append(labelLines, fmt.Sprintf("Mutes: %s", escapeMermaid(strings.Join(node.MuteTimeIntervals, ", "))))
		}
		if len(node.ActiveTimeIntervals) > 0 {
			labelLines = append(labelLines, fmt.Sprintf("Active: %s", escapeMermaid(strings.Join(node.ActiveTimeIntervals, ", "))))
		}

		nodeClass := "routeNode"
		if isRoot {
			nodeClass = "rootNode"
		}
		nodes = append(nodes, fmt.Sprintf("    %s[\"%s\"]:::%s", sID, strings.Join(labelLines, "<br/>"), nodeClass))

		hasChildren := len(node.Children) > 0
		if hasChildren {
			for _, child := range node.Children {
				childID := sanitizeMermaidID(child.ID)
				condition := formatEdgeMatchers(child.Matchers)
				edges = append(edges, fmt.Sprintf("    %s -->|\"%s\"| %s", sID, condition, childID))
				traverse(child)
			}

			// If parent route defines its own receiver, connect fallback
			if node.Receiver != "" {
				recID := getReceiverID(node.Receiver)
				if _, ok := receiverNodes[node.Receiver]; !ok {
					receiverNodes[node.Receiver] = fmt.Sprintf("    %s[\"🛡️ Receiver: %s\"]:::receiverNode", recID, escapeMermaid(node.Receiver))
				}
				edges = append(edges, fmt.Sprintf("    %s -.->|\"fallback if no children match\"| %s", sID, recID))
			}
		} else {
			// Terminal route dispatches directly to its receiver
			targetReceiver := node.Receiver
			if targetReceiver == "" {
				targetReceiver = node.InheritedReceiver
			}
			if targetReceiver != "" {
				recID := getReceiverID(targetReceiver)
				isInherited := node.Receiver == "" && node.InheritedReceiver != ""
				inheritedSuffix := ""
				if isInherited {
					inheritedSuffix = " (inherited)"
				}
				if _, ok := receiverNodes[targetReceiver]; !ok {
					receiverNodes[targetReceiver] = fmt.Sprintf("    %s[\"🛡️ Receiver: %s%s\"]:::receiverNode", recID, escapeMermaid(targetReceiver), inheritedSuffix)
				}
				edges = append(edges, fmt.Sprintf("    %s ==>|\"dispatches to\"| %s", sID, recID))
			}
		}
	}

	traverse(root)

	var sb strings.Builder
	sb.WriteString("flowchart TD\n")
	sb.WriteString("    %% Theme Styling Definitions\n")
	sb.WriteString("    classDef rootNode fill:#403D39,stroke:#EB5E28,stroke-width:2px,color:#FFFCF2;\n")
	sb.WriteString("    classDef routeNode fill:#252422,stroke:#5A5652,stroke-width:1.5px,color:#FFFCF2;\n")
	sb.WriteString("    classDef receiverNode fill:#EB5E28,stroke:#C2410C,stroke-width:2px,color:#FFFFFF,font-weight:bold;\n\n")

	sb.WriteString("    %% Routing Tree Nodes\n")
	for _, n := range nodes {
		sb.WriteString(n)
		sb.WriteString("\n")
	}
	sb.WriteString("\n")

	if len(receiverNodes) > 0 {
		sb.WriteString("    %% Receivers (Destination Endpoints)\n")
		for _, r := range receiverNodes {
			sb.WriteString(r)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	if len(edges) > 0 {
		sb.WriteString("    %% Routing Decision Branches\n")
		for _, e := range edges {
			sb.WriteString(e)
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// ToMermaidSimulation generates a highlighted simulation flow diagram in Mermaid format.
func (e *Engine) ToMermaidSimulation(root *RouteNode, sim *AlertSimulationResult) string {
	if root == nil || sim == nil {
		return e.ToMermaid(root)
	}

	matchedMap := make(map[string]RouteMatch)
	for _, m := range sim.MatchedRoutes {
		if m.Matched {
			matchedMap[m.RouteID] = m
		}
	}

	notifiedSet := make(map[string]bool)
	for _, r := range sim.ReceiversNotified {
		notifiedSet[r] = true
	}

	var nodes []string
	var edges []string
	receiverNodes := make(map[string]string)

	getReceiverID := func(name string) string {
		return fmt.Sprintf("rec_%s", sanitizeMermaidID(name))
	}

	var traverse func(node *RouteNode)
	traverse = func(node *RouteNode) {
		sID := sanitizeMermaidID(node.ID)
		isRoot := node.ID == "root"
		matchInfo, isMatched := matchedMap[node.ID]
		isTerminal := matchInfo.Terminal

		nodeClass := "dimmedNode"
		var labelLines []string

		if isRoot {
			labelLines = append(labelLines, "<b>ROOT ROUTE</b>")
			if isMatched {
				if isTerminal {
					nodeClass = "terminalNode"
				} else {
					nodeClass = "matchedNode"
				}
			}
		} else {
			title := fmt.Sprintf("<b>ROUTE (%s)</b>", escapeMermaid(node.ID))
			if node.Continue {
				title += " [CONTINUE]"
			}
			labelLines = append(labelLines, title)

			if isMatched {
				if isTerminal {
					if sim.Inhibited {
						nodeClass = "inhibitedNode"
						labelLines = append(labelLines, fmt.Sprintf("<b>[INHIBITED by %s]</b>", escapeMermaid(sim.InhibitedBy)))
					} else if sim.Muted {
						nodeClass = "mutedNode"
						labelLines = append(labelLines, fmt.Sprintf("<b>[MUTED: %s]</b>", escapeMermaid(strings.Join(sim.MutedBy, ", "))))
					} else {
						nodeClass = "terminalNode"
						labelLines = append(labelLines, "<b>[TERMINAL MATCH]</b>")
					}
				} else {
					nodeClass = "matchedNode"
				}
			}
		}

		if len(node.Matchers) > 0 {
			labelLines = append(labelLines, escapeMermaid(strings.Join(node.Matchers, ", ")))
		}

		nodes = append(nodes, fmt.Sprintf("        %s[\"%s\"]:::%s", sID, strings.Join(labelLines, "<br/>"), nodeClass))

		hasChildren := len(node.Children) > 0
		if hasChildren {
			for _, child := range node.Children {
				childID := sanitizeMermaidID(child.ID)
				_, childMatched := matchedMap[child.ID]
				condition := formatEdgeMatchers(child.Matchers)

				if isMatched && childMatched {
					edges = append(edges, fmt.Sprintf("        %s == \"%s\" ==> %s", sID, condition, childID))
				} else {
					edges = append(edges, fmt.Sprintf("        %s -. \"%s\" .-> %s", sID, condition, childID))
				}
				traverse(child)
			}
		} else {
			targetReceiver := node.Receiver
			if targetReceiver == "" {
				targetReceiver = node.InheritedReceiver
			}
			if targetReceiver != "" {
				recID := getReceiverID(targetReceiver)
				isNotified := notifiedSet[targetReceiver]

				recClass := "dimmedReceiver"
				recLabel := fmt.Sprintf("🛡️ Receiver: %s", escapeMermaid(targetReceiver))

				if isNotified {
					recClass = "notifiedReceiver"
					recLabel = fmt.Sprintf("🎯 NOTIFIED: %s", escapeMermaid(targetReceiver))
				} else if isMatched && isTerminal {
					if sim.Inhibited {
						recClass = "inhibitedReceiver"
						recLabel = fmt.Sprintf("🚫 SUPPRESSED: %s", escapeMermaid(targetReceiver))
					} else if sim.Muted {
						recClass = "mutedReceiver"
						recLabel = fmt.Sprintf("⏳ MUTED: %s", escapeMermaid(targetReceiver))
					}
				}

				if _, ok := receiverNodes[targetReceiver]; !ok {
					receiverNodes[targetReceiver] = fmt.Sprintf("        %s[\"%s\"]:::%s", recID, recLabel, recClass)
				}

				if isMatched && isTerminal && isNotified {
					edges = append(edges, fmt.Sprintf("        %s ==>|\"DISPATCH\"| %s", sID, recID))
				} else if isMatched && isTerminal && (sim.Inhibited || sim.Muted) {
					edges = append(edges, fmt.Sprintf("        %s -.->|\"SUPPRESSED\"| %s", sID, recID))
				} else {
					edges = append(edges, fmt.Sprintf("        %s -.-> %s", sID, recID))
				}
			}
		}
	}

	traverse(root)

	var labelPairs []string
	for k, v := range sim.Labels {
		labelPairs = append(labelPairs, fmt.Sprintf("%s=#quot;%s#quot;", k, escapeMermaid(v)))
	}
	alertHeader := strings.Join(labelPairs, ", ")

	var sb strings.Builder
	sb.WriteString("flowchart TD\n")
	sb.WriteString("    %% Simulation Flow Styling\n")
	sb.WriteString("    classDef matchedNode fill:#14532D,stroke:#22C55E,stroke-width:2.5px,color:#FFFFFF;\n")
	sb.WriteString("    classDef terminalNode fill:#15803D,stroke:#4ADE80,stroke-width:3px,color:#FFFFFF,font-weight:bold;\n")
	sb.WriteString("    classDef notifiedReceiver fill:#EB5E28,stroke:#22C55E,stroke-width:3px,color:#FFFFFF,font-weight:bold;\n")
	sb.WriteString("    classDef mutedNode fill:#78350F,stroke:#D97706,stroke-width:2px,color:#FDE68A;\n")
	sb.WriteString("    classDef mutedReceiver fill:#78350F,stroke:#D97706,stroke-width:1.5px,color:#FDE68A;\n")
	sb.WriteString("    classDef inhibitedNode fill:#7F1D1D,stroke:#EF4444,stroke-width:2px,color:#FECACA;\n")
	sb.WriteString("    classDef inhibitedReceiver fill:#7F1D1D,stroke:#EF4444,stroke-width:1.5px,color:#FECACA;\n")
	sb.WriteString("    classDef dimmedNode fill:#252422,stroke:#44403C,stroke-width:1px,color:#78716C;\n")
	sb.WriteString("    classDef dimmedReceiver fill:#252422,stroke:#44403C,stroke-width:1px,color:#78716C;\n\n")

	sb.WriteString(fmt.Sprintf("    subgraph Sim [\"⚡ Simulation: { %s }\"]\n", alertHeader))
	for _, n := range nodes {
		sb.WriteString(n)
		sb.WriteString("\n")
	}
	sb.WriteString("\n")

	if len(receiverNodes) > 0 {
		for _, r := range receiverNodes {
			sb.WriteString(r)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	if len(edges) > 0 {
		for _, e := range edges {
			sb.WriteString(e)
			sb.WriteString("\n")
		}
	}
	sb.WriteString("    end\n")

	return sb.String()
}

// ToMermaidMarkdown wraps the raw Mermaid diagram in a Markdown code block.
func (e *Engine) ToMermaidMarkdown(root *RouteNode) string {
	raw := e.ToMermaid(root)
	if raw == "" {
		return ""
	}
	return fmt.Sprintf("```mermaid\n%s```\n", raw)
}

// ExportMermaid parses yaml configuration and returns the raw Mermaid flowchart TD.
func (e *Engine) ExportMermaid(yamlContent string) (string, error) {
	tree, err := e.BuildTree(yamlContent)
	if err != nil {
		return "", err
	}
	return e.ToMermaid(tree), nil
}

// ExportMermaidMarkdown parses yaml configuration and returns Mermaid Markdown.
func (e *Engine) ExportMermaidMarkdown(yamlContent string) (string, error) {
	tree, err := e.BuildTree(yamlContent)
	if err != nil {
		return "", err
	}
	return e.ToMermaidMarkdown(tree), nil
}
