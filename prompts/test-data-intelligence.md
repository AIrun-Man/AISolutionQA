# Test Data Intelligence

## Inputs

- Validated requirements and scenario Acceptance-Criteria IDs
- Playwright MCP UI discovery forms and user journeys
- Normalized API operations and request schemas
- Explicit implementation database/service dependencies
- Approved reusable synthetic data inventory
- `allowSyntheticData` policy

## Instructions

Call `buildTestDataIntelligence` using observed required UI fields, required API request fields, and explicit database dependencies. Keep source references for every field. Reuse only datasets marked safe for reuse. Generate deterministic synthetic values only when policy allows and the type is supported; never synthesize passwords, tokens, credentials, private keys, payment data, or files. Use environment-variable references for sensitive values without storing their values. Leave unsupported mandatory data unresolved and report it as a blocker. Carry dataset IDs to generated test cases and define setup/cleanup only from explicit dependency metadata.

## Output

Return `TestDataIntelligenceModel` conforming to `platform-core/schemas/test-data-intelligence.schema.json`, including the data requirements matrix, per-scenario automation datasets, unresolved mandatory fields, and setup/cleanup strategies. Persist it under the configured Jira output folder.