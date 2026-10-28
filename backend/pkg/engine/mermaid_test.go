package engine

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEngineExportMermaid(t *testing.T) {
	eng := NewEngine()

	yamlContent := `
route:
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'team-default'
  routes:
  - matchers:
    - severity="critical"
    receiver: 'team-ops'
    continue: true
    routes:
    - matchers:
      - service="database"
      - env=~"prod.*"
      receiver: 'team-db'
      mute_time_intervals:
      - weekend-maintenance
  - matchers:
    - severity="warning"
    receiver: 'team-slack'
receivers:
- name: 'team-default'
- name: 'team-ops'
- name: 'team-db'
- name: 'team-slack'
time_intervals:
- name: weekend-maintenance
  time_intervals:
  - weekdays: ['saturday', 'sunday']
`

	mermaid, err := eng.ExportMermaid(yamlContent)
	assert.NoError(t, err)
	assert.NotEmpty(t, mermaid)

	// Check header & classDefs
	assert.True(t, strings.HasPrefix(mermaid, "flowchart TD\n"))
	assert.Contains(t, mermaid, "classDef rootNode")
	assert.Contains(t, mermaid, "classDef receiverNode")

	// Check root node
	assert.Contains(t, mermaid, `root["<b>ROOT ROUTE</b><br/><i>Default: team-default</i><br/>Group by: [alertname, cluster]<br/>Wait: 30s | Interval: 5m | Repeat: 12h"]:::rootNode`)

	// Check route branching with conditions on edges
	assert.Contains(t, mermaid, `root -->|"severity=#quot;critical#quot;"| root_1`)
	assert.Contains(t, mermaid, `root -->|"severity=#quot;warning#quot;"| root_2`)

	// Check receivers as destination nodes
	assert.Contains(t, mermaid, `rec_team_db["🛡️ Receiver: team-db"]:::receiverNode`)
	assert.Contains(t, mermaid, `rec_team_slack["🛡️ Receiver: team-slack"]:::receiverNode`)
	assert.Contains(t, mermaid, `root_1_1 ==>|"dispatches to"| rec_team_db`)

	// Check markdown export
	md, err := eng.ExportMermaidMarkdown(yamlContent)
	assert.NoError(t, err)
	assert.True(t, strings.HasPrefix(md, "```mermaid\nflowchart TD\n"))
	assert.True(t, strings.HasSuffix(md, "```\n"))
}

func TestEngineToMermaidSimulation(t *testing.T) {
	eng := NewEngine()

	yamlContent := `
route:
  receiver: 'default-receiver'
  routes:
  - matchers:
    - severity="critical"
    receiver: 'team-pager'
    routes:
    - matchers:
      - service="database"
      receiver: 'team-db-pager'
  - matchers:
    - severity="warning"
    receiver: 'team-slack'
receivers:
- name: 'default-receiver'
- name: 'team-pager'
- name: 'team-db-pager'
- name: 'team-slack'
`

	tree, err := eng.BuildTree(yamlContent)
	assert.NoError(t, err)

	simRes, err := eng.Simulate(SimulateRequest{
		Config: yamlContent,
		Alerts: []map[string]string{
			{"alertname": "DBDown", "severity": "critical", "service": "database"},
		},
	})
	assert.NoError(t, err)
	assert.Len(t, simRes.Results, 1)

	simMermaid := eng.ToMermaidSimulation(tree, &simRes.Results[0])
	assert.NotEmpty(t, simMermaid)

	// Check simulation subgraph
	assert.Contains(t, simMermaid, `subgraph Sim ["⚡ Simulation:`)
	// Check active matched path (thick arrow)
	assert.Contains(t, simMermaid, `==>`)
	// Check terminal match
	assert.Contains(t, simMermaid, `[TERMINAL MATCH]`)
	// Check notified receiver
	assert.Contains(t, simMermaid, `rec_team_db_pager["🎯 NOTIFIED: team-db-pager"]:::notifiedReceiver`)
}

func TestEscapeMermaid(t *testing.T) {
	assert.Equal(t, "foo #quot;bar#quot; &amp; &lt;baz&gt;", escapeMermaid("foo \"bar\" & <baz>"))
	assert.Equal(t, "line1 line2", escapeMermaid("line1\nline2"))
}
