# Platform Core

`@platform/core` contains agent-independent domain contracts and deterministic engines used by the Quality Engineering Platform.

## Capabilities

- Requirement-analysis models, deterministic engine, persistence, and validation
- Requirement understanding across functional/non-functional requirements, business rules, validations, assumptions, implicit requirements, and risks
- Stable Requirement-to-Code mappings persisted before code-backed test generation
- Unified evidence correlation across Jira requirements/history, exact implementation, API contracts, and optional ADRs
- Per-criterion evidence confidence and Requirement-to-Implementation-to-API-to-Xray-to-Automation traceability
- Pre-execution story readiness scoring and per-story evidence/readiness artifacts
- Scenario-to-test-case generation with stable requirement traceability
- Standardized test-case models and validation
- Application-discovery models
- Live UI discovery intelligence, navigation/user journeys, screen and component inventories
- Existing Xray repository/folder analysis, exact duplicate detection, automation/regression reuse, and coverage delta
- Configured UI/API automation repository discovery, framework/standards/pipeline intelligence, existing test inventories, explicit-link coverage discovery, and regression impact
- Reuse-first generation decisions, duplicate-prevention governance, and impact-based smoke/functional/regression/API/performance recommendations
- Seven-tier environment intelligence with redacted configuration differences
- Test-data requirements, safe reusable/synthetic data planning, and setup/cleanup strategies
- Configured governance engines for requirement, test, script, performance, hallucination, privacy, and enterprise quality gates
- Execution Readiness PASS/WARNING/BLOCK reports before branch/commit/PR/Actions side effects
- Locator governance and reliability scoring
- Traceability graph validation
- Feature-branch, PR, merge-commit, commit-history, and repository-diff lineage discovery with historical memory leads
- Evidence-backed Implementation Reconstruction Models for added/modified/deleted files, APIs, UI components, business logic, validation, data access, and error handling
- Implementation Trust scoring for story-to-PR/commit mappings, merge validity, branch mapping, ambiguity, unrelated commits, and target-branch integration
- Context-aware progressive disclosure routing with selected-only skill metadata and prompt loading
- Source impact mapping and requirement-versus-code evidence analysis
- Intelligent execution-scope selection, coverage, and risk analysis
- Requirement, Acceptance Criteria, code-path, validation, boundary, and negative coverage dimensions
- Requirement Coverage Matrix, file/function/API code mapping, coverage gap analysis, risk-based recommendations, governance gates, readiness, and trends
- Failure triage and test-maintenance findings
- Declarative end-to-end workflow planning
- Evidence-gated UI/API/contract/component/performance strategy selection
- API discovery and contract normalization, requirement/code correlation, API risk/coverage, Xray test design, and API automation planning
- Sanitized execution, coverage, traceability, and executive-summary reporting
- Coverage Intelligence JSON and executive dashboard HTML, written through the existing reporting module

The package has no dependency on an AI vendor, application under test, or test runner.

`analyzeRequirements` builds a schema-compatible draft from a Jira story and its acceptance criteria. It preserves criteria verbatim, places positive, negative, boundary, validation, authorization, security, integration, and explicit risk scenarios in the canonical `scenarios` array, and links automation candidates back to scenarios. Phrase-based classifications are conservative candidates for review, not a substitute for requirement approval. Existing writers still accept caller-selected directories; use the generation storage adapters to keep Jira artifacts under the configured output root.

`generateTestCases` requires Requirement-to-Code mappings for the story's acceptance criteria and embeds mapping IDs, repository, branch, PR (when available), commit, changed file, and implementation intent into each case. `writeRequirementCodeMappings` validates and persists the artifact conforming to `schemas/requirement-code-mapping.schema.json` using the repository's sanitized JSON writer.

For Jira artifact persistence, use `loadGenerationConfig`, `resolveJiraGenerationPaths`, `createJiraGenerationLayout`, and the story-specific writer adapters exported from `src/storage/generation.ts`. The configured output root is resolved relative to `generation-config.json` unless an absolute path is supplied. Existing explicit-directory writers remain supported.

`createJiraTestCaseRoutingPlan` routes generated cases to UI/API/Performance repository sections from existing requirement-to-strategy evidence. Persist returned Jira issue IDs and URLs with `writeJiraTestCaseIssueLinks`; the model is validated and stored under the same configured Jira output root.

`createCanonicalXrayImport` maps the existing test-case and Requirement Analysis contracts to organizational Xray fields. `writeXrayImportArtifacts` always persists canonical JSON and, when configured, derives CSV from that JSON. Imported Jira issue keys/URLs are persisted with `writeXrayTestIssueLinks`.

`analyzeCoverageIntelligence` composes Prompt 16 requirement analysis, requirement-code findings, `analyzeSourceImpact`, generated test cases, automation links, and traceability into a Requirement Coverage Matrix, file/function/API mapping, gap analysis, risk recommendations, configurable governance review, readiness metrics, and trend deltas. Use `writeCoverageIntelligenceReport` for its sanitized JSON report and executive HTML dashboard.

The API Intelligence layer exports `normalizeOpenApiDocument`, `apiContractsFromEndpointDefinitions`, `discoverApiContracts`, and `analyzeApiIntelligence`. It correlates normalized operations to requirements, source files and revision, generates Xray-formatted test designs, measures API-specific coverage/risk, applies governance, plans automation with existing API framework components, and writes a sanitized executive report.

`correlateEvidence` builds the versioned Unified Evidence Model from validated requirement analysis, implementation mappings/findings, explicit API mappings, optional historical Jira/ADR evidence, test cases, and script links. It never promotes keyword matches alone to confirmed behavior. `calculateStoryReadiness` reports the mean of applicable requirement, implementation, API, Xray, and automation confidence dimensions; API confidence is `null` only when API coverage is not applicable. It records the configurable `minimumReadinessScore` threshold (default 80) and pass/fail gate. Use `writeUnifiedEvidenceForJiraStory` and `writeStoryReadinessForJiraStory` to persist artifacts under the configured per-story output folder. `generateTestCases` can carry evidence, API, historical issue, ADR, and confidence references into standard test cases and Xray JSON/CSV.

The governance APIs load `governance-config.json` without threshold fallbacks. `coveragePolicyFromGovernance` and `apiPolicyFromGovernance` adapt central policy to existing engines; `evaluateEnterpriseQualityGate` combines all governance reports and `assertExecutionReady` blocks downstream side effects unless permitted. Persist per-domain and execution-readiness reports using `writeGovernanceReport`.

For deleted feature branches, `discoverImplementationSources` uses explicit story/repository links to select PR, merge commit, commit-history, or repository-diff evidence. Historical memory references are returned only as leads and are never trusted without current source confirmation. `evaluateImplementationTrust` applies the configured implementation trust policy before `buildImplementationReconstructionModel`; the generated source, reconstruction, and trust artifacts can be persisted with the story-scoped generation adapters. `selectProgressiveDisclosureRoute` returns only the skills and prompt contracts required by intent and repository context, and the loaders read only those selected files.

Jira, GitHub Enterprise/MCP, Xray, repository acquisition, and PR/Actions operations remain orchestrated through the existing connected integrations and workflow prompts. The core package defines and validates the evidence contracts; it does not embed credentials or introduce replacement clients.
