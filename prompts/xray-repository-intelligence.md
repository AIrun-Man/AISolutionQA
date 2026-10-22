# Existing Xray Repository Intelligence

## Inputs

- Validated Requirement Analysis
- Configured Xray repository path and Jira project
- Existing Xray repositories and folders
- Existing Xray test issues, executions, and historical coverage
- Existing automation and regression-suite inventories
- Connected Atlassian/Xray MCP integration

## Instructions

Use the connected Atlassian/Xray MCP integration and inspect its actual tool schemas. Read existing repository/folder organization, test issue keys, exact Acceptance-Criteria/scenario links, execution history, and coverage snapshots. Include automation and regression-suite references when available. Do not infer test coverage from title similarity. Classify only explicit links as current coverage; historical-only coverage is not a current passing test. Detect duplicates only when normalized summaries and explicit Acceptance-Criteria links match exactly. Preserve source issue URLs and report unavailable repositories, permissions, stale links, and unknown test statuses as warnings.

Call `analyzeExistingXrayRepository` and persist `xray-repository-analysis.json` under the configured Jira output folder. Feed the same inventory into `analyzeTestReuse` before test generation.

## Output

Return JSON conforming to `platform-core/schemas/xray-repository-analysis.schema.json` with repositories, folders, duplicates, execution evidence, coverage delta, and warnings. Do not create or modify remote Xray assets during analysis.