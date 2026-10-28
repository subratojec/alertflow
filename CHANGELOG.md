# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-28

### Added
- **Mermaid.js Diagram Export**: Export native, theme-adaptive Mermaid Markdown diagrams (`flowchart TD`) for GitHub/GitLab pull requests, runbooks, and architectural RFCs without hosting or uploading static image files.
  - **Routing Architecture Diagrams**: Renders complete route trees with branching matcher logic directly annotated on edges, and dedicated styled receiver endpoints.
  - **Live Simulation Flow Diagrams**: Visualizes active dispatch paths with vibrant green vectors, `[TERMINAL MATCH]` designations, and red `[INHIBITED]` badges indicating active alert suppression.
  - **Web UI Modal**: Added an interactive "Export Mermaid" modal dialog in the Visualizer with Architecture vs. Simulation flow toggles, Markdown/Raw tabs, live syntax preview, 1-click clipboard copy, and `.md`/`.mmd` file downloads.
  - **CLI Support**: Added `alertflow mermaid [config.yml]` and `alertflow export [config.yml] --format mermaid` commands with `--markdown` (`-m`), `--output` (`-o`), and `--alerts` (`-a`) flags for CI/CD pipeline automation and PR bots.
  - **Go Engine & REST API**: Added `ToMermaid`, `ToMermaidMarkdown`, `ToMermaidSimulation`, and `ToMermaidSimulationMarkdown` to `pkg/engine`, backed by a new `POST /api/mermaid` endpoint.
- **Informatory Website (`website/`)**:
  - Small, high-performance, responsive landing page with zero external CSS/JS dependencies.
  - Clean typography and deep charcoal palette with rust orange and emerald green accents.
  - Interactive feature walkthroughs, problem-vs-solution comparisons, and live screenshot mockups.
  - Smooth hover zoom magnification and high-resolution Lightbox modal for clear previewing.

## [0.1.0] - 2026-10-04

### Added
- GitHub Actions CI workflow (`ci.yml`) to automatically test Go backend and build React frontend.
- Added **Shareable Config Links**: You can now generate a shareable URL that securely encodes the current YAML configuration using `lz-string` compression.
- Added **Export Tree to Image**: You can now export the visual routing tree graph as a high-quality PNG image with a single click.
- Packaged frontend and backend into a single Docker container for easy deployment.
- Added minimize button to the MockAlertTester in the UI.
- Added environment variables to Docker Compose for flexible configuration.
- Added comprehensive launch README, documentation, and architecture notes.

### Fixed
- Fixed timezone parsing issue in Alertmanager configs by adding `tzdata` to the final Alpine Docker image (Resolves #2).
- Fixed build errors in CLI and tests.
- Reverted YAML interval structure to match Go parser requirements.
- Fixed frontend errors, type safety issues, proxy configurations, and YAML demo config issues.
