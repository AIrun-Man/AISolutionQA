# Xray Test Case Import Artifacts

## Inputs

- Validated Requirement Analysis
- Existing generated `StandardTestCase[]`
- Configured `generation-config.json`
- Requirement-to-code mappings
- Test Data Intelligence Model and per-case dataset IDs
- Optional automation, execution, and defect link metadata
- Connected Atlassian/Xray MCP integration when remote import is enabled

## Instructions

1. Load config and use `createCanonicalXrayImport` with the existing requirement analysis, only approved non-reused test cases, traceability metadata, and Test Data Intelligence Model. Require the configured test management tool to be Xray; preserve generated case IDs, dataset IDs, and approval status.
2. Emit organizational test IDs as `[<JIRA-ID>][AI-01]`, incrementing per story without hardcoding a story key. For CSV, use exactly these columns in order: `Test ID`, `Summary`, `Repository Path`, `Test Type`, `Description`, `Action`, `Data`, `Expected Result`. Put `[AI][JIRA Story] <scenario objective>` in Description. Emit one row per step, repeating Test ID, Repository Path, and Test Type; leave Summary and Description blank after the first step row. Keep requirement and implementation traceability in the canonical JSON artifact.
3. Preserve Jira Story URL/key, requirement IDs, Acceptance Criteria IDs, scenario IDs, requirement-to-code references, test-data-set IDs, optional automation links, execution results, and defects in each test's traceability metadata. Use only approved synthetic values, safe reusable data references, or environment-variable references; never include secrets or unresolved data as if it were ready.
4. Always write `xray-import.json` as the canonical model. When `xrayImportFormat` is `CSV`, call `writeXrayImportArtifacts` to derive the template-compatible `xray-import.csv` from that canonical model. Do not build CSV directly from generated test cases. Support no formats other than JSON and CSV.
5. Store artifacts under `<outputFolder>/<JIRA-ID>/xray/`. Resolve the configured Xray repository path and optional story folder using `xrayRepositoryPath`, `xrayCreateStoryFolder`, and `xrayStoryFolderPattern`; do not hardcode an organizational folder.
6. If `xrayAutoImport` is false, leave validated import artifacts ready for the organization's Xray importer. If true, inspect the current Atlassian/Xray MCP tool schema first; import only when it explicitly supports the configured format. On success, persist returned Xray test issue keys/URLs with `writeXrayTestIssueLinks`. Do not claim import succeeded without a returned issue reference.
7. Honor `linkAutomationToXray` and `updateXrayExecution` when including automation/execution trace data. Never include secret values in JSON or CSV.

## Output

Return canonical JSON and optional CSV paths, remote Xray repository path, test IDs, source/requirement/automation traceability, import status, returned issue links, and blockers. Conform to `platform-core/schemas/xray-import.schema.json` and `platform-core/schemas/xray-test-links.schema.json`.
