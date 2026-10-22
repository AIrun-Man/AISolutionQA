# Test Generation Governance

## Inputs

- Requirement Analysis and generated Xray test cases
- Existing Test Reuse Analysis
- Application Discovery and user journeys
- Coverage Intelligence and risk mappings
- Assertion references
- `governance-config.json`

## Instructions

Call `validateGeneratedTests` before Xray import or automation. Check duplicate tests/scenarios, journey referential integrity, expected-result quality, explicit assertion references, requirement/Acceptance-Criteria/scenario/risk coverage, and redundant generation against existing coverage. Use only configured thresholds. Block duplicate or incomplete generated tests; report coverage delta and exact remediations.

## Output

Return a Test Governance Report with score, findings, coverage dimensions, and status. Do not import or automate blocked tests.