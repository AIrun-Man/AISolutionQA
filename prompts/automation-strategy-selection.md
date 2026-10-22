# Automation Strategy Selection

## Inputs

- Validated Requirement Understanding Model
- Requirement-to-Code Mapping Model for the exact source revision
- Changed-file inventory and implementation analysis
- Available automation frameworks and configured runners
- `generation-config.json`

## Instructions

Load and validate `generation-config.json`. For each requirement, record its type, affected implementation surface, changed source files, and evidence-based rationale. Use `selectAutomationStrategies` from platform-core to produce stable decisions for UI, API, contract, component, and performance tests. Do not infer a surface from a filename alone. Performance selection requires an explicit non-functional requirement; component and performance strategies require an existing approved runner. Honor `uiGenerationEnabled`, `apiGenerationEnabled`, and `performanceGenerationEnabled`; skip disabled generation with a recorded reason. If a strategy is unsupported by the repository configuration, report a blocker rather than adding or replacing a framework.

Reuse the existing Playwright framework for UI tests and the existing API framework/contracts for API and contract tests. Generate automation only for approved test cases and preserve Requirement, Acceptance Criterion, code mapping, and test-case references.

## Output

Return decisions with strategy, requirement IDs/types, changed-file evidence, rationale, and availability status. Persist machine-readable decisions under the run's reports directory; do not commit generated reports.