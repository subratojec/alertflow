package main

import (
	"fmt"
	"github.com/prometheus/alertmanager/config"
)

func main() {
	yaml := `
route:
  receiver: 'default'
receivers:
- name: 'default'
`
	cfg, err := config.Load(yaml)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("Success! Route: %v\n", cfg.Route.Receiver)
	}
}
