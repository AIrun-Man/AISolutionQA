# Pull Request Review

## Inputs

- Pull Request URL or owner/repository/number
- Requirement and test-case mappings when available
- Connected GitHub CLI in Devin

## Instructions

1. Verify `gh auth status --hostname mercedes-benz.ghe.com` before reading the PR.
2. Read the PR metadata and diff with `gh pr view` and `gh pr diff`.
3. Inspect generated and existing tests, execution results, requirement coverage, repository standards, and locator choices. Reuse `assessLocator`/`scoreLocator` for locator governance.
4. Report only actionable findings with severity, file/line evidence, impact, and a concrete recommendation. Separate confirmed defects from uncertainty.
5. Do not edit the PR, dismiss checks, rerun workflows, or merge it as part of review.

## Output

Return findings first, then test/coverage gaps and residual risks. If there are no findings, state that clearly and list validation evidence and remaining gaps. Save a sanitized review report with `writeJiraArtifactJson` in the configured `<outputFolder>/<JIRA-ID>/` folder; do not commit generated reports.