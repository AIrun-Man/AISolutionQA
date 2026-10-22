# Quality Engineering Architecture

The authoritative traceability chain is:

```text
Jira Story / Requirement -> Requirement Analysis -> Requirement-to-Code Mapping -> Scenario -> Test Case -> Automation -> Coverage Matrix -> Gap/Risk/Governance -> Execution -> Coverage/Traceability/Executive Dashboard
```

Every link carries stable entity IDs and versions. The deterministic platform-core engines validate requirement/scenario/test-case models, application discovery, test reuse, environment and data models, source impact, execution selection, coverage, failure classification, and test-maintenance signals. The configured governance layer checks each generation artifact and blocks side effects unless the Enterprise Quality Gate permits execution. Devin orchestrates AI-assisted interpretation and external integration calls through connected Atlassian, Playwright, and GitHub MCP integrations; credentials are not embedded in framework code or artifacts.

Before generating test cases or automation, the workflow discovers the configured UI/API automation repositories and analyzes their frameworks, standards, and GitHub Actions pipelines. It inventories existing Xray tests, automation, and suites, then maps explicit links from requirements, APIs, UI components, business logic, and changed implementation to coverage and regression impact. Coverage delta and reuse governance must pass before generation. Existing assets are reused or extended first; only missing test coverage and automation may be generated. The resulting smart regression recommendation feeds coverage/readiness governance, the execution recommendation, GitHub Actions compatibility validation, and then authorized Actions execution. Missing repository or traceability evidence remains a blocker or widens scope to full regression.

Execution recommendations accept explicit environment and Safe Agile context, including INT and REX/RAM ART Program Increment values. Context is never inferred; regression scope is narrowed to explicitly impacted tests unless changed implementation cannot be mapped, in which case full regression is recommended.

Changed requirements, scenarios, or source entities make downstream mappings suspect until reviewed. Source changes without a known impact mapping select the full regression inventory. Coverage Intelligence composes the existing deterministic requirement, impact, traceability, and coverage engines into requirement/code matrices, gap and risk analysis, configurable governance gates, readiness metrics, and an executive dashboard. Product-defect classification requires explicit evidence and human review before Jira defect creation. Generated reports remain under the configured Jira output root and are not committed.

Quality gates reject:

- Requirements that fail configured requirement governance
- Duplicate/invalid tests or scripts that fail configured governance
- Unsafe performance plans, hallucinated references, and privacy-blocked artifacts
- PR, commit, or Actions side effects without a passing Enterprise Quality Gate
- Requirements without test coverage
- Approved test cases without automation when automation is required
- Active automation without a current result
- Failed, blocked, stale, or incomplete execution presented as passing
- Missing reports or broken trace links
