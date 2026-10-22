# Jira Test Case Creation and Routing

## Inputs

- `generation-config.json`
- Validated requirement analysis and generated test cases
- Requirement-to-Code mappings
- Evidence-backed automation strategy decisions
- Existing Test Reuse Analysis
- Test Data Intelligence Model
- Connected Atlassian MCP integration

## Instructions

1. Load and validate the config. Resolve the story URL from `jiraStoryUrl` with legacy `jiraUrl` fallback. Require `jiraBoardUrl`, `jiraProjectKey`, `testRepositoryPath`, and a supported `testManagementTool` before creating Jira issues. If a destination is missing or invalid, report a blocker and do not guess a board or repository.
2. Use Existing Test Reuse Analysis before routing. Do not create a new issue for an exact reusable scenario; link/reuse its returned Jira key and automation instead. For partial matches, extend an existing issue only when the configured MCP operation supports it; otherwise create only the distinct missing scenario. If no new cases remain, skip remote issue creation. Then call `createJiraTestCaseRoutingPlan` with only new/approved extension cases, strategy decisions, and resolved paths. Do not create cases listed in `unroutedTestCaseIds`. Stop if the required destination for any case is not `ready`.
3. Use the Atlassian MCP tools available in the current session. Inspect their schemas and the configured management tool's supported fields/operations. Do not assume Xray, Zephyr, TM4J, or Jira API method names or custom field identifiers.
4. For each stable test case ID, search within the configured project, board, and repository path before creation. Reuse an existing matching issue when found; otherwise create one test case in its primary UI/API/Performance repository section. If a case is routed to multiple sections, do not create duplicate Jira issues; associate the existing issue with each additional section only when the configured tool explicitly supports it.
5. Preserve the generated test-case ID, source Story URL/key, Acceptance Criteria, scenario, repository section, and Requirement-to-Code references in the Jira issue. Never invent steps or expected outcomes.
6. Preserve the generated case's current approval status. Keep draft cases draft in Jira where supported; never mark tests approved to bypass the platform's human review gate.
7. Persist the routed `routing.testCases` once with `writeTestCasesForJiraStory`. Validate and persist an idempotent mapping from test-case ID to returned Jira issue key/URL and section with `writeJiraTestCaseIssueLinks`; conform to `platform-core/schemas/jira-test-case-links.schema.json` and store `jira-test-case-links.json` under the configured Jira output folder.
8. When `testManagementTool` is `Xray`/`XRAY`, call `createCanonicalXrayImport` with the non-reused generated test cases, traceability metadata, and Test Data Intelligence Model. Persist JSON with `writeXrayImportArtifacts`; JSON is always the canonical source. If `xrayImportFormat` is `CSV`, derive `xray-import.csv` from that same canonical JSON model. Write both importer artifacts under `<outputFolder>/<JIRA-ID>/xray/`.
9. If `xrayAutoImport` is true, use only the existing Atlassian/Xray integration after inspecting its current tool schema and confirming support for the configured importer format. Import the generated JSON/CSV artifact; persist every returned Xray Jira issue key/URL with `writeXrayTestIssueLinks`. If automatic import is disabled or unavailable, leave validated artifacts ready for the organization's importer workflow and report that state; never claim tests were created remotely.
10. Use returned Jira/Xray identifiers in subsequent automation generation and traceability updates. If permissions, board visibility, project mapping, or test-management-tool support is missing, retain generated draft artifacts and report the exact blocker without claiming Jira creation succeeded.

For Xray imports, use the canonical JSON and CSV behavior specified in `xray-import.md`; do not produce CSV directly from raw generated test cases.

For API test cases, use the API Intelligence report's normalized operation, contract, and requirement mappings. Preserve the organizational Xray fields and the API categories (positive, negative, boundary, authentication, authorization, error-handling, contract-validation, and schema-validation). Create no Xray-specific cases unless `testManagementTool` is configured as `Xray`; use the configured existing tool path otherwise.

## Output

Return the per-section case IDs and repository paths, reused/created Jira issue keys and URLs, the persisted link-artifact path, skipped/unrouted IDs, and any blockers. Keep external Jira updates idempotent and do not transition issues unless the available integration explicitly supports the requested transition.
