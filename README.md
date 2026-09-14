# AlertFlow

AlertFlow is an Alertmanager Route Visualizer & CI Checker.

## Features
- **Visualizer**: Paste your `alertmanager.yml` to see an interactive routing tree.
- **Mock Alert Tester**: Test labels to see exactly which receivers get notified and why.
- **CI Checker**: A CLI tool (`alertflow check` and `alertflow diff`) to integrate into your CI/CD pipeline to prevent routing regressions.

## Local Setup
The easiest way to run the full stack locally is with Docker Compose:
```bash
docker-compose up
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

## CLI Usage
To build the CLI:
```bash
cd backend
go build -o alertflow ./cmd/alertflow
```

Check a config:
```bash
./alertflow check ../path/to/alertmanager.yml
```

Diff configs:
```bash
./alertflow diff ../examples/old.yml ../examples/new.yml --alerts ../examples/sample-alerts.json
```
