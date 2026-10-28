# <img src="./frontend/public/logo.svg" width="40" align="center" /> AlertFlow

**A visual simulator and CI/CD testing engine for Prometheus Alertmanager configurations.**

<img width="1920" height="942" alt="image" src="https://github.com/user-attachments/assets/24cc702c-ce22-403d-92f4-d42940dd3a2a" />


## The Problem
Configuring Prometheus Alertmanager is notoriously difficult. With complex routing trees, nested matchers, `continue` directives, time-based mutes, and inhibition rules, it is almost impossible to know exactly where an alert will go until it fires in production at 3 AM. 

Existing tools either just check your YAML syntax or provide outdated UIs that ignore crucial routing logic (like Inhibition).

## The Solution
**AlertFlow** bridges the gap between Development and Operations:
1. **Interactive UI**: A gorgeous, glassmorphism-styled React application that parses your `alertmanager.yml` and draws an interactive routing tree. 
2. **Simulation Engine**: Under the hood, AlertFlow imports the official Alertmanager Go packages. When you dispatch mock alerts in the UI, AlertFlow simulates exactly how the real Alertmanager routes them, fully respecting `inhibit_rules` and `mute_time_intervals`.
3. **CI/CD Regression Testing**: AlertFlow isn't just a UI tool. It ships with a CLI tool designed to run in GitHub Actions to ensure pull requests don't silently break your routing behavior.
4. **Native Mermaid.js Export**: Export routing trees and simulated alert flows directly into GitHub/GitLab pull requests and RFCs without uploading static image files.

---

## ⚡ Quickstart

AlertFlow is distributed via Docker with heavily optimized, multi-stage builds. You don't need Go or Node.js installed to run it.

Run AlertFlow with a single Docker command:

```bash
docker run -d -p 8080:8080 ghcr.io/subratojec/alertflow:latest
```

> Once started, open port `8080` in your browser. A sample configuration is pre-loaded so you can explore immediately!

---

## 🛠 Features

### 1. Multi-Alert Simulation & Inhibition
Alertmanager allows high-priority alerts to suppress low-priority alerts via `inhibit_rules`. AlertFlow processes batches of multiple alerts simultaneously, highlighting inhibited alerts in **RED** and displaying exactly which active alert triggered the suppression.

### 2. Time-Travel Mute Testing
Using the Datetime picker in the Mock Alert Tester, you can simulate alerts firing during specific hours. AlertFlow evaluates your `mute_time_intervals` and `active_time_intervals`, highlighting muted routes in **ORANGE**.

### 3. Native Mermaid.js Diagram Export
Export routing trees and simulation flows directly as native Mermaid Markdown (`flowchart TD`):
- **Routing Architecture Tree**: Branching matcher logic is annotated directly on decision arrows with styled receiver endpoints.
- **Live Simulation Flow**: Matched routes light up in vibrant green with `[TERMINAL MATCH]` designations and `[INHIBITED]` badges for suppressed alerts.
- **Web UI & 1-Click Copy**: Includes a dedicated export modal with raw and markdown views, 1-click clipboard copy, and `.md`/`.mmd` file downloads.

### 4. Shareable Config Links & Image Exports
- **Shareable Links**: Generate highly compressed URLs of your exact YAML layout using `lz-string` to easily share configurations with teammates.
- **PNG Graph Export**: Export the visual routing tree to a high-res PNG image with a single click.

### 5. CI/CD Pipeline Integration (The CLI)
Run AlertFlow in your terminal or CI/CD pipelines (e.g., GitHub Actions, GitLab CI) to catch regressions *before* merging:

**Validate Syntax & Orphan Receivers:**
```bash
alertflow check alertmanager.yml
```

**Export Mermaid Diagrams for PR Comments & Runbooks:**
```bash
# Output raw Mermaid flowchart TD
alertflow mermaid alertmanager.yml

# Output wrapped in a GitHub/GitLab markdown block (```mermaid ... ```)
alertflow mermaid alertmanager.yml --markdown

# Export simulation flow for specific test alerts
alertflow mermaid alertmanager.yml --alerts sample-alerts.json --markdown

# Save diagram to a file
alertflow mermaid alertmanager.yml -o routing.mmd
```

**Prevent Regressions with `diff`:**
Test a new configuration against the existing production configuration using a suite of sample alerts. If the routing behavior diverges (e.g., a critical alert drops its on-call pager), the CLI outputs the divergence and exits with code `1` to fail CI:
```bash
alertflow diff old.yml new.yml --alerts sample-alerts.json
```

---

## 🌐 Informatory Website

A standalone, responsive landing website is available in the [`website/`](./website) directory. It includes feature deep-dives, visual problem-vs-solution comparisons, live screenshot previews with interactive hover zoom, and a full-resolution lightbox viewer.

---

## Architecture
- **Backend**: Go (built on `github.com/prometheus/alertmanager/config` and `dispatch`)
- **Frontend**: React + Vite (using `@xyflow/react` for interactive tree rendering)
- **Deployment**: Single unified Docker image (React frontend embedded natively in the Go binary)

---

## Roadmap
Curious about what features are coming next? **[Check out our official Roadmap on the GitHub Wiki!](https://github.com/subratojec/alertflow/wiki/Roadmap)**
