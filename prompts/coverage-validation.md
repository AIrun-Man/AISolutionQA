# Coverage Validation

## Inputs

- Active requirements
- Approved test cases
- Active automation mappings
- Current execution results
- Source impact report and test inventory when selecting an execution scope
- Requirement-to-Code mappings and scenario categories
- Xray test issue links returned by the configured integration when Xray is enabled
- Automation IDs and concrete generated script paths

## Instructions

Validate explicit relationships only. Identify missing tests, missing Xray issue links, missing automation scripts, missing execution, failed execution, stale mappings, and incomplete evidence. When Xray is enabled, require a returned issue key/URL for each generated test before counting Xray coverage. Count script coverage only from concrete generated script paths; automation IDs alone are not script evidence. Do not count missing or stale results as passing.

Use the existing `selectTests` engine for smoke, API, impacted regression, or full scope. If regression impact is missing, stop and report the missing input instead of silently selecting all tests. Use `analyzeCoverageIntelligence` to compose the existing `analyzeCoverage`, Requirement Analysis, requirement/code validation, and traceability outputs. Include the Requirement Coverage Matrix, file/function/API-to-test mapping, requirement/code/test gaps, six-dimensional metrics, high-risk recommendations, governance decision, readiness score, and historical trend deltas when prior reports exist. Derive every link only from explicit mappings; report absent evidence as uncovered and preserve risk by priority. Optimize for meaningful risk coverage, not test count.

## Output

Return the existing `coverage-report.json` conforming to `platform-core/schemas/coverage-report.schema.json` and the integrated `coverage-intelligence-report.json` conforming to `platform-core/schemas/coverage-intelligence.schema.json`. Include requirement, implementation, API, Xray, and script coverage; return Xray coverage as not applicable only when Xray is disabled. Include all matrix links, gaps, risk, threshold failures, readiness, and evidence supporting each conclusion.

Persist both artifacts with the existing Jira storage/reporting adapters in the configured `<outputFolder>/<JIRA-ID>/` folder; generate the leadership dashboard with `writeCoverageIntelligenceReport`.
