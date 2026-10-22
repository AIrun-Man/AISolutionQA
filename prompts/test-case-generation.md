# Test Case Generation

## Inputs

- Requirement-analysis JSON
- Application-discovery JSON
- Requirement-to-Code mapping for the exact implementation revision
- Unified Evidence Model containing Jira history, explicit implementation confirmations, API contract mappings, and optional ADR evidence
- Existing Test Reuse Analysis and Test Data Intelligence Model
- Historical test executions, failure classifications, defects, and coverage reports when available

## Instructions

Use `generateTestCases(analysis, implementationMappings, evidenceModel, reuseAnalysis, testDataModel)` as the canonical scenario-to-case mapping. Never generate test cases from requirements or acceptance criteria alone. Skip exact reusable scenarios, recommend extension/linking for partial or automation-only reuse, and create cases only for missing scenarios. Derive behaviors from explicit requirements and semantically confirmed implementation; use API contracts for documented API tests, and historical Jira/ADR evidence only to add context and risk, never to override current requirements or implementation. Cover positive/functional, negative, boundary, validation, authorization, security, integration, regression, and risk categories when evidence supports them. Preserve scenario, Acceptance Criterion, evidence IDs/confidence, historical issue, API operation, ADR, test-data-set, repository, branch, PR, commit, changed-file, change-type, affected-area, and implementation-intent links. Use only the data references/values approved by Test Data Intelligence. Remove duplicates and do not invent preconditions, data, or expected behavior. Stop and report mapping gaps rather than filling them by inference. Cases remain `draft` until human approval.

## Output

Return JSON conforming to `platform-core/schemas/test-cases.schema.json`. Include ID, version, title, priority, scenario type, preconditions, ordered steps, expected result, draft status, and requirement-to-code traceability. Keep each generated test consumable by the existing test-case validator and automation prompts.
