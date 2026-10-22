# Coverage Intelligence

## Inputs

- Prompt 16 Requirement Analysis and authoritative Jira source snapshot
- Acceptance Criteria IDs and Requirement-to-Code mappings
- Requirement-versus-code validation findings
- PR, branch, commit, Git diff, and the existing `analyzeSourceImpact` report
- Reviewed file/function/API code-path mappings with repository/revision provenance
- Generated standardized test cases and Test Case-to-Automation links
- Execution results and traceability validation when available
- Previous coverage report and approved governance overrides when available
- Existing Xray repository/reuse analysis, current automation references, and unresolved mandatory test data fields

## Instructions

1. Run an initial coverage review before automation generation by calling `analyzeCoverageIntelligence` with `reviewStage: "pre-automation"`. Reuse the Requirement Analysis, code-validation findings, test reuse delta, generated test cases, explicit code-path mappings, risk evidence, test-data blockers, and traceability. This phase gates requirements, every Acceptance Criterion, implementation mappings, code paths, and test cases; do not require automation before the automation-generation stage. Do not invent function/API paths or infer test coverage from filenames.
2. Build requirement rows linking each Jira-backed requirement to its Acceptance Criteria, code paths, test-case IDs, and automation IDs. A requirement is fully covered only when its Jira requirement exists, has Acceptance Criteria, has implementation evidence, maps to one or more test cases, and has one or more automation scripts. Keep partial and uncovered states distinct and list missing links.
3. Build code coverage rows at file/function/API granularity, retaining repository, branch, PR, and commit. Reuse `analyzeSourceImpact` and `validateTraceability`; include every unmapped changed file as an explicit gap. A code path is covered only when an existing generated test case explicitly maps to it. Report code with no requirement mapping as possible scope creep and code with no tests as uncovered.
4. Classify missing tests, missing implementations, missing code mappings, missing automation, scope creep, uncovered code paths, and Acceptance Criteria gaps. Preserve stable IDs and evidence paths.
5. Calculate requirement, Acceptance Criteria, code-path, test-case, automation, and risk coverage using explicit links. Prioritize critical/high requirements and high-risk code/API paths. Include gap recommendations and previous-report deltas when history is available.
6. Evaluate coverage using the validated `governance-config.json` Quality Gates and map its configured requirement, Acceptance-Criteria, critical-requirement, and high-risk-code thresholds with `coveragePolicyFromGovernance`. Do not use hardcoded defaults or silently substitute a policy. Missing or stale data is not passing evidence. Critical-requirement and high-risk-code checks are not applicable when their denominator is zero; report that state explicitly.
7. Review coverage before automation generation and block that stage when required source/test-design coverage is insufficient. After automation is generated and linked, call `analyzeCoverageIntelligence` again with `reviewStage: "final"` to create the complete matrix, automation metrics, gaps, risks, trends, and governance result before execution/promotion. Do not mark a PR or automation ready for promotion when governance fails.
8. Use `writeCoverageIntelligenceReport` from the existing reporting module to persist the sanitized JSON report and leadership HTML dashboard under the configured Jira output folder.

## Output

Return the Requirement Coverage Matrix, Code Coverage Mapping, missing requirements/tests/implementations, coverage metrics, high-risk areas, failed governance thresholds, review/readiness score, trend deltas, and executive dashboard. Conform to `platform-core/schemas/coverage-intelligence.schema.json` and keep the existing `coverage-report.schema.json` artifact for compatibility.
