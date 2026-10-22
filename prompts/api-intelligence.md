# API Intelligence Layer

## Inputs

- Jira Story URL and validated Requirement Analysis
- Repository branch/PR/commit and code diff
- Authorized API portal URL/content (oneAPI or approved portal)
- Existing API framework endpoint definitions, schemas, request builder, and response validator
- Generated standardized test cases and `generation-config.json`
- Connected Atlassian MCP and GitHub MCP when enabled

## Instructions

1. **Discover APIs (Capability 60).** Use only authorized, authenticated sources. Follow the existing approved browser/MCP access flow to inspect oneAPI portals, Swagger, OpenAPI, ReDoc, and authoritative documentation. Search by Jira story terms, project, and known API names. Capture endpoints, methods, request/response schemas, authentication requirements, error codes, and source links; do not bypass access controls or invent endpoints. If a portal cannot be reached, use repository contract files/endpoint definitions and report discovery limits.
2. **Normalize contracts (Capability 61).** Normalize OpenAPI/Swagger JSON and portal-observed contracts with `normalizeOpenApiDocument`/the existing endpoint definitions. Preserve operation ID, method/path, parameters, request/response schema references, expected/error statuses, required headers, auth scheme, and scopes. Keep unresolved `$ref`s as named references rather than fabricating their contents.
3. **Correlate requirements (Capability 62).** Use explicit Requirement/Acceptance-Criteria mappings to API operation IDs with source evidence. Report requirements without API mappings and APIs without a requirement. Do not rely on keyword similarity alone as proof.
4. **Correlate code (Capability 63).** Inspect the exact repository, branch, PR, commit, and diff using the connected GitHub MCP integration. Map API operation IDs to controller, service, business-logic, and validation files, retaining repository/revision evidence. Report unmapped operations and changed files.
5. **Assess coverage and risk (Capabilities 64-65).** Call `analyzeApiIntelligence` with discovered contracts, explicit requirement/code mappings, existing generated test cases, and automation references. Preserve endpoint/method/request/response/validation/error/security coverage. Rank critical requirements, authenticated/security-sensitive APIs, high business-impact operations, and broad code changes; recommend additional tests for high-risk gaps.
6. **Design API tests (Capability 66).** Derive positive, negative, boundary, authentication, authorization, error-handling, contract, and schema tests from the combined requirements, contract, and implementation evidence. Reuse the canonical test-case engine and existing API contract validators. Do not invent data, auth behavior, or expected responses.
7. **Create Xray cases (Capability 67).** When `testManagementTool` is `Xray`, use the existing Atlassian MCP integration and inspect its available tool schemas. Create cases in configured Jira destinations only after verifying permissions and destination settings. Format case IDs as `[<JIRA-ID>][API-01]` and preserve Objective, Preconditions, Source Requirement, Expected Outcome, Action, Data, and Expected Result. Search for existing matching cases first and persist returned Jira IDs/URLs. Never assume Xray tool methods or custom fields.
8. **Plan automation (Capability 68).** Reuse existing `HttpClient`, `RequestBuilder`, endpoint definitions, named environments, Zod schemas, `validateResponse`, and API reporting. The report's automation plan identifies per operation scripts, shared utilities, schema-backed test data, environment-variable names, and request builder. Never write secret values.
9. **Apply governance (Capability 69).** Use `apiPolicyFromGovernance` with the validated `governance-config.json` Quality Gates for API coverage, contract coverage, critical APIs, authentication, and high-risk endpoints. Report not-applicable scopes when a denominator is empty. Block API script generation/promotion when a required configured threshold fails; missing evidence is not a pass. Do not substitute hardcoded API policy defaults.
10. **Report (Capability 70).** Call `writeApiIntelligenceArtifact` to persist the sanitized JSON and executive API dashboard through the existing reporting module under the configured Jira output root. Include portal source evidence, contract, requirement/code links, Xray test IDs, endpoint coverage dimensions, risk, governance failures, and readiness metrics.

## Output

Return the API Intelligence report conforming to `platform-core/schemas/api-intelligence.schema.json`, Xray case links, per-operation automation plans, governance decision, unresolved mappings, and discovery limitations. Reuse existing Jira, GitHub, API, test-case, and reporting components; do not add another API client, browser framework, or test runner.
