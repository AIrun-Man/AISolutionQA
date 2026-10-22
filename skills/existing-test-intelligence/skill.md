# Existing Test Intelligence

## Purpose

Analyze the configured UI and API automation repositories before test-case or automation generation. Produce evidence-backed repository, framework, standards, pipeline, test, automation, coverage, impact, delta, reuse, and execution recommendation models. Generate only coverage that is missing after reuse and governance checks.

## Inputs

- Approved `generation-config.json` automation repository references
- Exact implementation source and changed-file/API/component evidence
- Acquired repository snapshots with immutable revisions, when available
- Existing Xray tests, automation assets, suites, and execution/coverage evidence
- Existing framework, coverage, GitHub, implementation, Xray, and governance reports

## Outputs

- Automation Repository Model and repository inventories
- Framework Intelligence Model, Repository Standards Model, and Pipeline Execution Model
- Test Inventory, Automation Inventory, and Suite Inventory
- Coverage Discovery Model, Regression Impact Model, and Coverage Delta Model
- Reuse and Generation Strategy, Reuse Governance Report, and Execution Recommendation

## Dependencies

- `github-intelligence` for authorized repository discovery, acquisition, and Actions evidence
- `implementation-intelligence` for exact source revision and changed implementation evidence
- `coverage-intelligence` for requirement/code/test coverage and final governance
- Existing Jira/Xray, Playwright, API, generation configuration, and governance contracts
- Prompt contracts in `../../prompts/automation-repository-discovery.md`, `../../prompts/framework-intelligence.md`, `../../prompts/repository-standards-intelligence.md`, `../../prompts/pipeline-intelligence.md`, `../../prompts/existing-test-discovery.md`, `../../prompts/existing-automation-intelligence.md`, `../../prompts/coverage-discovery.md`, `../../prompts/regression-impact-intelligence.md`, `../../prompts/coverage-delta-intelligence.md`, `../../prompts/reuse-first-generation.md`, `../../prompts/smart-regression-suite-builder.md`, and `../../prompts/reuse-governance.md`

## Guardrails

- Discover only configured repositories; use the existing authorized GitHub integration and inspect its actual tool schemas.
- Clone only when required and authorized. Record acquisition status, repository, immutable revision, limitations, and evidence references.
- Treat missing or inaccessible evidence as unavailable/unknown, never as proof that tests or coverage do not exist.
- Count coverage only from explicit, current requirement, Acceptance-Criteria, scenario, API, component, business-logic, or source links. Do not infer coverage from names or path similarity.
- Reuse active linked tests, automation, utilities, and suites. Extend partial matches. Never generate a duplicate or claim a reuse check passed when it was not performed.
- Preserve configured frameworks, standards, and pipelines. Do not add clients, frameworks, dependencies, credentials, or remote side effects.
- A changed file without an explicit impact mapping requires full regression or an explicit unresolved-scope warning.
- Keep existing intent, permission, human-approval, artifact-path, generation-flag, and governance contracts authoritative.