# Existing Test Reuse Intelligence

## Inputs

- Requirement Analysis and scenario IDs
- Existing Xray tests and returned Jira issue links
- Existing UI/API/contract automation with test and scenario links
- Regression-suite membership
- Historical executions and coverage

## Instructions

Run `analyzeTestReuse` before test generation. Reuse only an active asset with the exact scenario ID, or exact normalized title plus the same explicit Acceptance-Criteria set. Acceptance-Criteria overlap by itself is a partial-reuse opportunity, not proof that the behavior is already tested. Preserve each asset's source Story key; a foreign Story's `AC-1` must never be treated as the current Story's `AC-1` without an explicit mapped requirement/criterion link. Include Xray issue keys, automation paths, regression suite names, and historical status. Do not count deprecated/unknown tests or historical-only coverage as current coverage. Generate no duplicate for exact reusable scenarios; retain partial matches as explicit extension work and recommend new tests only for uncovered scenarios.

Pass the `TestReuseAnalysis` to `generateTestCases` so exact reusable scenarios are filtered. Persist `test-reuse-analysis.json` under the configured Jira output folder.

## Output

Return scenario-level reusable/partial/missing decisions, requirement coverage delta, and `create`, `extend-existing`, or `link-existing` recommendations conforming to the existing test reuse model.