# AlertFlow Website Images Guide

Place your screenshots in this folder (`website/images/`). The website automatically detects and displays them. If an image file is not yet present, a clean placeholder with instructions will be shown.

---

## Recommended Screenshots

### 1. `hero-dashboard.png`
- **Location**: Hero Section (Top of the landing page)
- **Suggested Resolution**: 1920 × 1080 (16:9 ratio) or full browser window
- **What to Capture**:
  - Run AlertFlow locally and load the demo configuration.
  - Show the split view: YAML editor on the left and the visual routing tree canvas on the right.
  - Ensures visitors immediately understand what AlertFlow looks like.

### 2. `simulation-flow.png`
- **Location**: Feature 1 — Multi-Alert Simulation & Inhibition
- **Suggested Resolution**: 1600 × 900
- **What to Capture**:
  - Open the **Mock Alert Tester** panel on the right.
  - Click **"Simulate Routing"** with 2 mock alerts.
  - Show the green highlighted active path and terminal route on the canvas, with the notified receiver.

### 3. `mermaid-export.png`
- **Location**: Feature 2 — Mermaid.js Export for RFCs & PRs
- **Suggested Resolution**: 1400 × 900
- **What to Capture**:
  - Click the **"Export Mermaid"** button on the canvas toolbar.
  - Show the open modal with the generated `flowchart TD` code and tab toggles (or show the diagram rendered inside a GitHub PR comment).

### 4. `ci-cd-terminal.png`
- **Location**: Feature 3 — CI/CD Pipeline & CLI
- **Suggested Resolution**: 1200 × 700
- **What to Capture**:
  - A clean terminal screenshot running:
    ```bash
    alertflow diff old.yml new.yml --alerts sample-alerts.json
    ```
  - Showing how AlertFlow validates configs in CI pipelines.
