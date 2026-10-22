<<<<<<< HEAD
# AI-Assisted Quality Engineering Platform

This repository implements an AI-agent-independent quality engineering platform. It combines deterministic domain engines, reusable Playwright and API frameworks, traceability, coverage analysis, reporting, governed generation templates, and GitHub Actions execution.

## Repository structure

- `platform-core/` - Requirement, test-case, application discovery, test reuse, environment, test-data, locator, traceability, coverage, and reporting engines.
- `playwright-framework/` - Playwright TypeScript framework for browser automation.
- `api-framework/` - TypeScript API automation framework.
- `docs/` - Engineering, governance, and operational documentation.
- `architecture/` - Architecture views and design boundaries.
- `prompts/` - Reusable, vendor-neutral task prompts.
- `intent.md`, `context.md`, `agents.md`, `memory.md`, `router.md`, and `skills/` - Progressive intent, evidence, ownership, read-only memory, and selective capability disclosure catalogs.
- `templates/` - Automation, report, requirement, and Pull Request templates.
- `reports/` - Generated report target and retention guidance.
- `generation-config.json` - Jira context, configurable artifact root, and UI/API/performance generation flags.
- `governance-config.json` - Central, schema-validated enterprise governance thresholds and policies.
- `test-data/` - Shared synthetic test data.
- `workflows/` - CI/CD operating documentation.
- `.github/` - Pull Request governance and executable workflows.
- `AGENT.md` - Agent abstraction and mandatory operating contract.

## Included capabilities

- Requirement analysis models
- Deterministic requirement, scenario, impact, test-selection, failure, and maintenance engines
- Configured requirement, test, script, performance, hallucination, privacy, and enterprise quality governance
- Standardized test case models
- Application discovery models
- Locator governance
- Playwright UI framework
- API automation framework
- Reporting and evidence capture
- CI/CD execution workflows
- Devin-orchestrated Jira and GitHub workflows through connected MCP and GitHub CLI tools
- Traceability and coverage models
- Merge traceability, commit reconstruction, implementation trust governance, and context-aware skill/prompt selection
- Pull request governance
- Agent-agnostic operations guidance

## Quick start

```bash
npm install
npx playwright install chromium
npm run build
npm run lint
npm run test:core
npm run test:api
npm run test:playwright -- --project chromium
```

## Platform principles

- Agent independent
- Strong typing
- Reusability
- CI/CD driven execution
- Documentation first
- Traceable outcomes
- Secure artifact handling

## Environment variables

| Variable | Purpose |
|---|---|
| `TEST_ENV` | UI environment name: `DEV`, `QA`, `INT`, `SIT`, `UAT`, `PREPROD`, `PROD`, or legacy `local`, `test`, `staging`, `production` |
| `BASE_URL` | UI test base URL for the test environment |
<<<<<<< Updated upstream
| `API_BASE_URL` | API base URL for the test environment |
| `RUN_PLAYWRIGHT_SMOKE` | Set to `true` to execute the live UI example |
=======
| `API_BASE_URL` | API base URL for the specific environment |
| `<ENV>_BASE_URL` | Explicit UI base URL for an enterprise tier such as `DEV_BASE_URL` or `UAT_BASE_URL` |
| `<ENV>_API_BASE_URL` | Explicit API base URL for an enterprise tier such as `DEV_API_BASE_URL` or `PROD_API_BASE_URL` |
| `RUN_PLAYWRIGHT_SMOKE` | Set to `true` to execute the live UI examples |
>>>>>>> Stashed changes
| `RUN_API_TESTS` | Set to `true` to execute the live API example |

Secrets must be supplied by the execution environment and must never be committed.
=======
# AISolutionQA
>>>>>>> b10370605de22daf1bd71d6db783f7c14464e677
