# Prompt Library

These vendor-neutral prompts define deterministic inputs, constraints, and output contracts for agent-assisted quality engineering. Agents must use repository schemas and must not replace missing evidence with inferred behavior.

| Prompt | Output |
|---|---|
| `requirement-analysis.md` | Requirement-analysis JSON |
| `governance-configuration.md` | Central governance-config loading and validation |
| `requirement-governance.md` | Requirement Quality Score and pre-analysis governance report |
| `test-generation-governance.md` | Duplicate, assertion, journey, and coverage validation for generated tests |
| `script-governance.md` | Framework, coding, security, locator, and naming validation for scripts |
| `performance-governance.md` | Configured load and environment safety limits |
| `hallucination-guardrails.md` | API/UI/business-rule reference validation against evidence catalogs |
| `data-privacy-governance.md` | Configured scan, mask, replace, block, and synthetic-data policy |
| `enterprise-quality-gate.md` | Final PASS/WARNING/BLOCK execution readiness gate |
| `jira-story-processing.md` | Jira story/hierarchy/history, GitHub MCP acquisition, optional ADR discovery, and Requirement-to-Code mapping |
| `scenario-generation.md` | Traceable scenario coverage using the canonical requirement-analysis contract |
| `code-analysis.md` | Repository evidence and impact analysis |
| `requirement-code-validation.md` | Evidence-backed requirement implementation findings |
| `automation-strategy-selection.md` | Evidence-backed UI/API/contract/component/performance strategy decisions |
| `source-impact-analysis.md` | Impacted modules, requirements, tests, and unmapped files |
| `application-exploration.md` | Application-discovery JSON |
| `environment-intelligence.md` | Environment model and safe configuration differences |
| `xray-repository-intelligence.md` | Existing Xray repositories, folders, executions, duplicates, and coverage delta |
| `test-reuse-intelligence.md` | Reusable Xray/UI/API tests, regression coverage, and missing-test recommendations |
| `automation-repository-discovery.md` | Configured UI/API automation repository discovery and revision-backed inventory |
| `framework-intelligence.md` | Language, UI/API/execution frameworks, patterns, assertions, and shared utilities |
| `repository-standards-intelligence.md` | Repository layout, naming, page-object, locator, request, and assertion conventions |
| `pipeline-intelligence.md` | GitHub Actions execution, environment names, reporting, artifacts, and compatibility |
| `existing-test-discovery.md` | Existing UI/API tests and smoke/functional/regression/performance suites |
| `existing-automation-intelligence.md` | Explicitly linked reusable scripts, components, clients, utilities, and helpers |
| `coverage-discovery.md` | Explicit requirement/API/component/business-logic coverage inventory |
| `regression-impact-intelligence.md` | Changed implementation to impacted tests, suites, repositories, and scope |
| `coverage-delta-intelligence.md` | Existing versus changed-implementation coverage classification |
| `reuse-first-generation.md` | Ordered reuse, extension, and missing-only generation strategy |
| `smart-regression-suite-builder.md` | Impact-based smoke, functional, regression, API, and performance recommendations |
| `reuse-governance.md` | Pre-generation completeness and duplicate asset governance |
| `test-data-intelligence.md` | Test data matrix, safe datasets, and setup/cleanup strategy |
| `test-case-generation.md` | Standardized test cases |
| `jira-test-case-creation.md` | Idempotent creation in configured Jira repository sections |
| `xray-import.md` | Canonical Xray JSON generation and CSV export/import guidance |
| `ui-automation-generation.md` | Playwright artifacts and mappings |
| `api-automation-generation.md` | API tests and mappings |
| `api-intelligence.md` | API discovery, contract analysis, correlations, Xray tests, governance, and reporting |
| `coverage-validation.md` | Coverage report, gaps, and risk |
| `coverage-intelligence.md` | Requirement/code matrices, gaps, metrics, governance, risk, and executive dashboard |
| `pr-review.md` | Evidence-backed test and automation review |
| `failure-analysis.md` | Failure classification and root-cause evidence |
| `test-maintenance.md` | Flaky/unused/duplicate/locator/repeated-failure findings |
| `jira-defect-sync.md` | Jira defect creation and execution synchronization |
| `workflow-orchestration.md` | End-to-end Devin workflow across requirement, code, automation, execution, defect, and reporting stages |
| `pr-creation.md` | Review-ready Pull Request content |
