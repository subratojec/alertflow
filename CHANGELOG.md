# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
