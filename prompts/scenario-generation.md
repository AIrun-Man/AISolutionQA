# Scenario Generation

## Inputs

- Validated requirement-analysis JSON from Prompt 16
- Jira story and acceptance-criteria provenance when available

## Instructions

Use the existing `analyzeRequirements` output and `RequirementScenario` contract. Preserve existing scenario IDs; add only scenarios needed to cover explicit acceptance criteria or business rules. Represent positive cases with `functional` and use `negative`, `boundary`, `validation`, `security`, `regression`, or `risk` only when supported by source evidence. Every scenario must cite one or more existing Acceptance Criterion IDs. Do not invent validation rules, security controls, or regression behavior. Validate the completed analysis with `validateRequirementAnalysis` before test-case generation.

## Output

Return an updated `RequirementAnalysis` conforming to `platform-core/schemas/requirement-analysis.schema.json`. Keep scenarios in the existing `scenarios` array so `generateTestCases` consumes them without an adapter.