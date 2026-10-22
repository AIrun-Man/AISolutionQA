# API Framework

Reusable TypeScript API automation and contract-validation framework.

## Structure

- `src/clients/` owns transport, timeout, parsing, and normalized responses.
- `src/endpoints/` owns operation definitions.
- `src/requests/` resolves encoded paths, queries, headers, and bodies.
- `src/validators/` composes status, header, and schema validation.
- `src/schemas/` owns runtime API contracts.
- `src/environments/` validates named environments.
- `src/reporting/` writes machine- and human-readable API reports.

## Execution

```text
npm run build --workspace api-framework
npm run test:api
```

Unit tests run without a live dependency. The live example runs only when `RUN_API_TESTS=true`.

Jira-driven generated API scripts, locators, variables, and reports use the paths resolved from `generation-config.json`, under `<outputFolder>/<JIRA-ID>/API/`. Existing API report writers continue to accept an explicit output directory.

The platform-core API Intelligence layer normalizes these endpoint definitions and Zod schemas alongside authorized OpenAPI/Swagger/portal discovery. It produces requirement/code correlations, Xray case designs, risk/governance results, and an automation plan. Script execution continues to use this framework's existing client, request builder, validator, and reporting.
