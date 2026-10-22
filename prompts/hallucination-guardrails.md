# AI Hallucination Guardrails

## Inputs

- Generated API/UI/locator/validation/business-rule references
- Jira Requirement Analysis
- Normalized API contracts
- Playwright Application Discovery
- `governance-config.json`

## Instructions

Call `detectHallucinations` against exact evidence catalogs. API operation IDs/method-paths must exist in discovered contracts; UI routes, locators, and validation IDs must exist in Playwright discovery; business rules must match an explicit requirement rule; request schemas must exist in an operation contract. Do not accept source-code names or model-generated references as proof. Apply configured blocking rules and minimum evidence counts.

## Output

Return a Hallucination Detection Report with the unsupported reference, source artifact, evidence catalog searched, confidence score, and status. BLOCK prevents generation from being staged or executed.