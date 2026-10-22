# Application Exploration

## Inputs

- Validated requirement analysis and acceptance-criteria IDs
- Retrieved feature branch/revision
- Approved running application environment and account
- Application base URL
- Connected Playwright MCP integration

## Instructions

Use the connected Playwright MCP tools to open the running application and inspect the visible user experience. Inspect actual tool schemas before use. Explore only requirement-relevant paths, screens, pages, forms, fields, buttons, tables, dialogs, navigation, workflows, and user journeys. Record visible/enabled state, labels, observed validation, navigation triggers, and requirement/feature-branch provenance. Do not infer screens or behavior from source code alone. Source code can point to likely routes/components but only MCP observation confirms the rendered experience. Use synthetic, non-sensitive inputs and do not submit destructive actions or mutate protected data. Assess actionable locator candidates using the governed priority and leave inaccessible or ambiguous behavior as partial/needs-review.

Normalize observations with `buildApplicationDiscoveryIntelligence`. Preserve the legacy `ApplicationDiscovery` shape in `uiDiscoveryModel`; also provide navigation model, screen inventory, component inventory, requirement IDs, and the exact repository/branch/commit analyzed. Validate journey page and navigation references with `validateDiscovery`.

## Output

Return JSON conforming to `platform-core/schemas/application-discovery-intelligence.schema.json`, including the nested legacy discovery contract, plus locator assessments and observed requirement discrepancies. Persist under the configured Jira output folder; never include credentials, session tokens, or unrestricted personal data.
