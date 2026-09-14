package engine

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEngineValidate(t *testing.T) {
	eng := NewEngine()

	yamlContent := `
route:
  receiver: 'team-X'
receivers:
  - name: 'team-X'
  - name: 'team-Y'
`
	res, err := eng.Validate(yamlContent)
	assert.NoError(t, err)
	if !res.Valid {
		t.Fatalf("Validation failed with errors: %v", res.Errors)
	}
	assert.True(t, res.Valid)

	// team-Y is unreferenced, should produce a warning
	if assert.Len(t, res.Warnings, 1) {
		assert.Contains(t, res.Warnings[0].Message, "team-Y")
	}
}

func TestEngineSimulate(t *testing.T) {
	eng := NewEngine()

	yamlContent := `
route:
  receiver: 'default-receiver'
  routes:
    - matchers:
        - team="frontend"
      receiver: 'frontend-pager'
      continue: true
    - matchers:
        - severity="critical"
      receiver: 'critical-pager'
receivers:
  - name: 'default-receiver'
  - name: 'frontend-pager'
  - name: 'critical-pager'
`
	
	// Test 1: matches only default
	res, err := eng.Simulate(SimulateRequest{
		Config: yamlContent,
		Alert: map[string]string{"alertname": "Test", "team": "backend"},
	})
	assert.NoError(t, err)
	assert.Contains(t, res.ReceiversNotified, "default-receiver")
	assert.NotContains(t, res.ReceiversNotified, "frontend-pager")

	// Test 2: matches frontend (continue: true) and then doesn't match critical
	res2, err := eng.Simulate(SimulateRequest{
		Config: yamlContent,
		Alert: map[string]string{"alertname": "Test", "team": "frontend"},
	})
	assert.NoError(t, err)
	// Should hit frontend-pager. Wait, continue=true means it goes to the NEXT sibling.
	// Will it hit default-receiver? No, if a child matches and continues, it evaluates siblings. If none match, is default-receiver notified?
	// Actually, Alertmanager's dispatch logic: if any child matches, the parent's receiver is NOT notified, unless the child has continue:true AND no sibling matched? Wait. 
	// The simulator returns receivers notified. Let's see what Alertmanager actually does.
	assert.Contains(t, res2.ReceiversNotified, "frontend-pager")
}
