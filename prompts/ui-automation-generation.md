# UI Automation Generation

## Inputs

- Approved test cases
- Unified Evidence Model and implementation references carried by each approved test case
- Application discovery
- Environment Intelligence Model and environment-specific configuration
- Test Data Intelligence Model and linked data-set IDs
- Existing Test Reuse Analysis
- Locator assessments
- Existing Playwright framework
- `generation-config.json`

## Instructions

Load and validate `generation-config.json`; stop if `uiGenerationEnabled` is false. Resolve the Jira output paths with the existing platform-core generation storage helpers and create the required directory layout. Generate only approved, non-reused test cases. Use screens, controls, dialogs, and user journeys observed by Playwright MCP on the exact feature branch. Consume each case's environment and test-data-set references, respecting setup/cleanup and secret environment-variable references. Use the confirmed UI implementation behavior and evidence references linked to each case to target observable behavior; do not infer unsupported interactions from the requirement title. Reuse the Playwright framework, fixtures, page objects, components, reporting, and `templates/automation/page-object.ts.template`, `fixture.ts.template`, and `test.ts.template`. Save page objects and test scripts with `writeGeneratedFile(..., "uiScripts", ...)`, locators under `UI/Locators`, and non-secret variables or environment-variable references under `UI/Variables`. Keep locators in page objects, assertions in tests, and setup in fixtures. Use semantic waits and `requireApprovedLocator`; never add fixed delays or a parallel test framework.

Playwright HTML reports and test results use the configured Jira output paths. Do not write generated artifacts into workspace-default `playwright-report/` or `test-results/` folders.

## Output

Create typed page objects, tests, fixtures, and test data following `templates/automation/` in `<outputFolder>/<JIRA-ID>/UI/Scripts`. Save locator artifacts in `<outputFolder>/<JIRA-ID>/UI/Locators` and non-secret variables in `<outputFolder>/<JIRA-ID>/UI/Variables`. Report each Test Case-to-Automation mapping and validation command.
