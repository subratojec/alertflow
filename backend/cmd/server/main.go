package main

import (
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"net/http"

	"github.com/alertflow/backend/pkg/engine"
)

//go:embed ui/*
var uiFS embed.FS

var eng = engine.NewEngine()

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func validateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, _ := eng.Validate(string(body))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func treeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := eng.BuildTree(string(body))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func simulateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req engine.SimulateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := eng.Simulate(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func main() {
	http.HandleFunc("/api/validate", corsMiddleware(validateHandler))
	http.HandleFunc("/api/tree", corsMiddleware(treeHandler))
	http.HandleFunc("/api/simulate", corsMiddleware(simulateHandler))

	// Extract the "ui" directory from the embed.FS
	subFS, err := fs.Sub(uiFS, "ui")
	if err != nil {
		log.Fatal("Failed to extract sub filesystem: ", err)
	}

	// Serve the static frontend
	http.Handle("/", http.FileServer(http.FS(subFS)))

	log.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
