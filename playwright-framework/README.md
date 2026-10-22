# Playwright Framework

Reusable, parallel-safe Playwright TypeScript framework.

## Structure

- `src/pages/` owns locators and user-facing interactions.
- `src/fixtures/` composes typed page objects and environment state.
- `src/utils/` provides reporting and locator governance helpers.
- `src/config/` validates named environments.
- `src/test-data/` contains synthetic typed data.
- `src/tests/` contains business-readable specifications.

## Execution

```text
npm run build --workspace playwright-framework
npm run test:playwright -- --project=chromium
```

The live example runs only when `RUN_PLAYWRIGHT_SMOKE=true`. Playwright captures HTML reports, screenshots on failure, video on failure, and traces on first retry.

The Playwright config uses the shared `generation-config.json` resolver. HTML reports and test results are stored under the configured `<outputFolder>/<JIRA-ID>/UI/` folders. Set `GENERATION_CONFIG_PATH` to select a non-default config file.
