# Test Maintenance Intelligence

## Inputs

- Existing standardized test cases
- Recent execution history with timestamps and statuses, plus the history window/completeness
- Locator candidates from Playwright page objects, including uniqueness, stability, and exception justification

## Instructions

Call `analyzeTestMaintenance` with the available inventory, full locator candidates, and explicit `historyComplete`/`historyWindowStart` options. Preserve the configured history window and failure threshold. Do not label a test unused when execution history is incomplete; distinguish “no history supplied” from verified absence over the agreed retention window. Use `assessLocator` from the existing locator-governance module.

## Output

Persist `test-maintenance.json` with `writeJiraArtifactJson` in the configured `<outputFolder>/<JIRA-ID>/` folder. Include evidence and a recommendation for each finding; recommendations do not automatically delete, rewrite, or quarantine tests.