# Reports

Generated Jira workflow artifacts are stored under the `outputFolder` configured in `generation-config.json`, grouped by Jira ID. Execution report contents include:

- `execution-summary.json`
- `index.html`
- `artifact-manifest.json`
- UI HTML report, screenshots, video, and traces
- API HTML report and sanitized validation evidence

Pull Request evidence is retained for 14 days. Protected-branch reports and failure evidence are retained for 30 days by the provided workflows. Secrets, tokens, cookies, credentials, and unrestricted personal data are prohibited.

Generated contents are not committed. The repository's `reports/` directory remains available for samples and legacy callers; Jira generation must use its configured output root.
