package main

import (
	"encoding/json"
	"fmt"
	"os"
	"slices"

	"github.com/spf13/cobra"
	"github.com/alertflow/backend/pkg/engine"
)

var eng = engine.NewEngine()

var rootCmd = &cobra.Command{
	Use:   "alertflow",
	Short: "AlertFlow is an Alertmanager Route Visualizer & CI Checker",
}

var checkCmd = &cobra.Command{
	Use:   "check [config.yml]",
	Short: "Check an Alertmanager config for valid routing",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		content, err := os.ReadFile(args[0])
		if err != nil {
			fmt.Printf("Error reading file: %v\n", err)
			os.Exit(1)
		}

		res, err := eng.Validate(string(content))
		if err != nil {
			fmt.Printf("Internal error validating config: %v\n", err)
			os.Exit(1)
		}

		if !res.Valid {
			fmt.Println("Validation failed with errors:")
			for _, e := range res.Errors {
				fmt.Printf(" - %s\n", e.Message)
			}
			os.Exit(1)
		}

		if len(res.Warnings) > 0 {
			fmt.Println("Config is valid but has warnings:")
			for _, w := range res.Warnings {
				fmt.Printf(" - %s\n", w.Message)
			}
			failOnWarning, _ := cmd.Flags().GetBool("fail-on-warning")
			if failOnWarning {
				os.Exit(2)
			}
		} else {
			fmt.Println("Config is valid.")
		}
	},
}

var diffCmd = &cobra.Command{
	Use:   "diff [old.yml] [new.yml]",
	Short: "Diff routing behavior between two configs",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		alertsFile, _ := cmd.Flags().GetString("alerts")
		if alertsFile == "" {
			fmt.Println("Error: --alerts flag is required for diffing")
			os.Exit(1)
		}

		alertsData, err := os.ReadFile(alertsFile)
		if err != nil {
			fmt.Printf("Error reading alerts file: %v\n", err)
			os.Exit(1)
		}

		var sampleAlerts []map[string]string
		if err := json.Unmarshal(alertsData, &sampleAlerts); err != nil {
			fmt.Printf("Error parsing alerts JSON: %v\n", err)
			os.Exit(1)
		}

		oldContent, err := os.ReadFile(args[0])
		if err != nil {
			fmt.Printf("Error reading old config: %v\n", err)
			os.Exit(1)
		}

		newContent, err := os.ReadFile(args[1])
		if err != nil {
			fmt.Printf("Error reading new config: %v\n", err)
			os.Exit(1)
		}

		diffsFound := false
		for i, alert := range sampleAlerts {
			oldRes, err1 := eng.Simulate(engine.SimulateRequest{Config: string(oldContent), Alerts: []map[string]string{alert}})
			newRes, err2 := eng.Simulate(engine.SimulateRequest{Config: string(newContent), Alerts: []map[string]string{alert}})

			if err1 != nil || err2 != nil {
				fmt.Printf("Error simulating alert %d: %v / %v\n", i, err1, err2)
				continue
			}

			if len(oldRes.Results) == 0 || len(newRes.Results) == 0 {
				fmt.Printf("Error: missing simulation results for alert %d\n", i)
				continue
			}

			oldRec := oldRes.Results[0].ReceiversNotified
			newRec := newRes.Results[0].ReceiversNotified

			diff := false
			if len(oldRec) != len(newRec) {
				diff = true
			} else {
				oldCopy := append([]string(nil), oldRec...)
				newCopy := append([]string(nil), newRec...)
				slices.Sort(oldCopy)
				slices.Sort(newCopy)
				diff = !slices.Equal(oldCopy, newCopy)
			}

			if diff {
				diffsFound = true
				fmt.Printf("Diff found for alert %v:\n", alert)
				fmt.Printf("  Old receivers: %v\n", oldRec)
				fmt.Printf("  New receivers: %v\n", newRec)
			}
		}

		if !diffsFound {
			fmt.Println("No routing differences found for the provided sample alerts.")
		} else {
			os.Exit(1)
		}
	},
}

func init() {
	checkCmd.Flags().Bool("fail-on-warning", false, "Exit with code 2 if warnings are found")
	diffCmd.Flags().String("alerts", "", "Path to sample alerts JSON file")
	rootCmd.AddCommand(checkCmd)
	rootCmd.AddCommand(diffCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
