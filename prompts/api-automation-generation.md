# API Automation Generation

## Inputs

- Approved test cases
- Authoritative API contract
- Existing API framework
- `generation-config.json`
- Approved API Intelligence report, normalized contract operations, and Xray case links
- Environment Intelligence Model and Test Data Intelligence Model
- Existing Test Reuse Analysis

## Instructions

Load and validate `generation-config.json`; stop if `apiGenerationEnabled` is false or applicable API governance thresholds failed. Require the API Intelligence report, approved non-reused Xray cases, exact API contract operations, implementation references, and environment/data-set references before script generation. Resolve Jira output paths with the existing platform-core storage helpers. Reuse the existing API framework's `HttpClient`, endpoint definitions, request builder, environment configuration, Zod schemas, response validators, and reporting. Follow `templates/automation/api-test.ts.template`. Save API scripts with `writeGeneratedFile(..., "apiScripts", ...)`, locator artifacts under `API/Locators`, and non-secret variables or environment-variable references under `API/Variables`. Route API reports to the configured `API/Reports` folder. Validate exact status, required headers, content type, request/response schemas, authentication/authorization, documented error responses, and business outcome. Redact secrets and isolate mutable data; do not add another client or auth mechanism.

## Output

Create typed API tests and only the required reusable framework assets under `<outputFolder>/<JIRA-ID>/API/Scripts`. Store locators in `<outputFolder>/<JIRA-ID>/API/Locators` and non-secret variables in `<outputFolder>/<JIRA-ID>/API/Variables`. Report operation/contract references, Xray Test Case-to-Automation mappings, coverage categories, and validation commands.
