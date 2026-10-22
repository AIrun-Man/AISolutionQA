# Jira Defect Creation and Execution Synchronization

## Inputs

- Failure analysis and sanitized execution evidence
- Source Jira story key
- Coverage report and traceability links
- Connected Atlassian MCP integration

## Instructions

Use only the Atlassian MCP tools available in this Devin session; inspect their schemas instead of assuming tool names. Create a defect only when the failure classification is `product-defect`. Search for a matching open defect first to avoid duplicates. Include concise reproduction steps, expected/actual behavior, affected build/revision, linked story, test/result IDs, and sanitized evidence references. Do not attach secrets, raw tokens, or unrestricted personal data.

For Jira execution synchronization, update the source story with the current execution status, requirement/test/automation traceability, and coverage summary. Make updates idempotent, preserve existing Jira content, and report permission failures without claiming success. Do not transition or close issues unless the requested workflow and available MCP tool explicitly support that action.

When synchronizing a Jira test run, load `jira-test-case-links.json` and update each created test-case issue with its linked automation script path, automation repository branch/commit/PR, execution/run URL, result, and associated defect key when present. Preserve the trace chain `Story -> Test Case -> Automation -> Execution -> Defect`; use stable platform IDs and returned Jira issue keys/URLs. Search before creating links or defects to avoid duplicates, and do not assume custom field names or tool methods.

## Output

Return created/updated issue keys, links, fields changed, evidence attached, duplicate checks, and any rejected or blocked operation with its cause.