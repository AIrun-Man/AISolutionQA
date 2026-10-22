# Jira Story Processing

## Inputs

- Jira issue key or supported Jira URL
- Connected Atlassian MCP integration

## Instructions

Use the Atlassian MCP tools available in this Devin session. Inspect their available schemas; do not assume tool names or fabricate fields. Read the story summary, description, acceptance criteria, metadata, comments, linked issues/stories, parent and child stories, epics, enhancements, defects, and linked development items. Preserve source wording, issue keys, relationship types, and comment IDs/update times. Separate authoritative requirements from discussion, stale comments, historical context, and defect context. Read comments for context, but do not persist full comment bodies by default. Record missing or contradictory acceptance criteria as blockers instead of resolving them by inference.

For configured generation, use `jiraStoryUrl` when present and fall back to the legacy `jiraUrl`; do not break existing configurations. Use `jiraBoardUrl`, `jiraProjectKey`, `testRepositoryPath`, and `testManagementTool` as Jira test destinations, not as story source values. Do not infer or hardcode a board URL.

Establish requirement-to-code traceability before test design. Discover the repository and story-associated feature branch with the connected GitHub MCP integration; inspect its actual tool schemas before use. If the branch exists and maps to the story, retrieve that exact revision into the approved local analysis workspace. If it is confirmed missing, call `discoverImplementationSources` in priority order: linked PRs (including closed/merged PRs), merge commits, story-linked commit history, then repository diff. Use read-only memory references only as discovery leads and verify each against authorized repository evidence. Run `evaluateImplementationTrust`; stop reconstruction if trust is blocked or below configured policy. Only then build the Implementation Reconstruction Model and acquire its exact source revision. Use the existing authenticated GitHub Enterprise integration only for operations not supported by MCP, and only when already authorized. Record repository, branch, PR URL, commit SHA, changed files, and source URLs. Never substitute the default branch or assume an unlinked change belongs to the story. If branch status is unresolved or no trustworthy source revision is available, report a blocker and do not generate test cases.

Build historical context before implementation analysis: inspect previously implemented related stories, linked enhancements, related defects, and available change history. Preserve issue keys, source links, implementation references, and relevant outcomes. Treat historical evidence as supporting context, not a replacement for the current story or current implementation.

Pass the normalized Jira story, acceptance criteria, and `jiraContext` containing source URL, retrieval time, selected metadata, linked defect keys/statuses, related issue keys and relationship types, and comment IDs/update times to the existing `analyzeRequirements` engine. Store the source snapshot and engine output in the configured `<outputFolder>/<JIRA-ID>/` directory using the Jira storage adapters. Do not include credentials or unrestricted personal data in artifacts.

After source retrieval, create Requirement-to-Code mappings that connect each Acceptance Criterion to evidence from the changed implementation or trusted reconstruction. Include stable `RCM-*` IDs, repository, branch, PR when available, commit, changed file, change type (`added`, `modified`, or `deleted`), affected areas (business logic, API, validation, database, UI, error handling, or other), and a concise implementation-intent summary. Validate against `platform-core/schemas/requirement-code-mapping.schema.json`, call `writeRequirementCodeMappingsForJiraStory`, and store `requirement-code-mapping.json` under the configured Jira folder. Do not treat keyword matches as proof of behavior.

Discover API contracts from the oneAPI Portal, Swagger, OpenAPI, ReDoc, and authoritative API documentation; preserve endpoint/method, request/response schema, authentication, and error-status references. Then search for ADRs in `docs/adr`, `adr`, `architecture`, and `decision-records`. ADRs are optional; record discovered decisions as supporting evidence only. Evidence precedence is Jira requirements, current implementation code, API contracts, then ADR documents.

## Output

- Jira source snapshot with metadata, comment references, related issue relationships, linked defects, and source URLs
- Historical Jira context and exact feature branch/PR/commit acquisition references
- Implementation Source Model and Implementation Trust report; Reconstruction Model when the feature branch is missing
- Requirement-to-Code mapping with repository, branch, PR, commit, changed files, and implementation evidence
- Requirement-analysis JSON conforming to `platform-core/schemas/requirement-analysis.schema.json`
- Blocking questions and unresolved contradictions