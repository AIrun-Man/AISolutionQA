# Reporting Standard

Each execution package contains a JSON summary, HTML index, and artifact manifest. UI evidence is associated with a test attempt; API evidence includes sanitized operation, status, timing, and validation failures.

For Jira-driven generation, `generation-config.json` owns the output root. Persist the execution summary and generated reports under `<outputFolder>/<JIRA-ID>/`; UI reports/test results and API reports belong under their respective UI/API folders. This location is configurable and must not be replaced with a repository-relative hardcoded report directory.

Coverage intelligence writes a sanitized `coverage-intelligence-report.json` and `coverage-dashboard.html` through the existing reporting module. The dashboard summarizes requirement and code-path matrices, coverage metrics, gaps, high-risk areas, governance failures, readiness, and trend deltas when prior snapshots are available.

Investigation order:

1. Execution summary
2. Specialized UI or API report
3. Error and test-step context
4. Screenshot or sanitized request metadata
5. Trace
6. Video or diagnostic logs

Every artifact records execution, revision, environment, and attempt identity.
