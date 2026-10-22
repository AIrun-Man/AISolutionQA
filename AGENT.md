# Agent Operating Contract

This repository is a TypeScript quality-engineering platform with three workspaces: [platform-core](platform-core/README.md), [playwright-framework](playwright-framework/README.md), and [api-framework](api-framework/README.md). Treat [README.md](README.md) and the governance configuration as the canonical entry points.

## Core expectations for agents

- Follow the user's requested scope exactly; do not force the full lifecycle into narrow code or review tasks.
- Read [README.md](README.md), [docs/README.md](docs/README.md), and the relevant package README before changing code.
- Use [generation-config.json](generation-config.json) and [governance-config.json](governance-config.json) as the source of truth; do not invent defaults when config is missing or invalid.
- Keep changes minimal, requirement-driven, and traceable to the relevant scenario or test.
- Respect data and environment boundaries: only use approved environments, redact secrets, and never commit sensitive values.
- Create commits or PRs only when the user explicitly asks.

## Workflow and quality gates

When the task involves the end-to-end quality lifecycle, complete the stages in order:

1. Analyze requirements
2. Analyze code
3. Explore the app or API
4. Generate tests
5. Generate automation
6. Execute the smallest relevant validation
7. Validate results and coverage
8. Prepare a PR only when requested

For narrower requests, do only the applicable work and validation.

## Project map

- [platform-core](platform-core/) owns schemas, governance, traceability, requirements, coverage, and reporting engines.
- [playwright-framework](playwright-framework/) owns browser automation and page-object patterns.
- [api-framework](api-framework/) owns API automation and contract validation.
- [docs](docs/) contains standards, governance, and operational guidance.
- [prompts](prompts/) contains reusable task prompts and contracts.
- [templates](templates/) contains generation and review templates.

## Validation commands

Use the smallest relevant command for the task:

- `npm ci`
- `npm run build`
- `npm run lint`
- `npm run validate:workflows`
- `npm run test:core`
- `npm run test:api`
- `npm run test:playwright -- --project=chromium`
- `npm test` for the full repository suite

Before browser tests, install Chromium with `npx playwright install chromium`.

## Guardrails

- Prefer the existing framework boundaries and templates in [templates](templates/).
- Keep locators in page objects/components; keep assertions in tests.
- Use governed selectors and page-object conventions documented in [docs/locator-governance.md](docs/locator-governance.md).
- Preserve evidence and store only sanitized, non-secret results.
- Do not claim a governance gate ran unless the command was actually executed and the result was inspected.
- Live UI/API examples are opt-in via environment variables such as `RUN_PLAYWRIGHT_SMOKE` and `RUN_API_TESTS`; verify URLs and configs before enabling them.

## Useful references

- [README.md](README.md)
- [docs/standards.md](docs/standards.md)
- [docs/configuration.md](docs/configuration.md)
- [docs/locator-governance.md](docs/locator-governance.md)
- [docs/automation-generation.md](docs/automation-generation.md)
- [docs/reporting-standard.md](docs/reporting-standard.md)
- [architecture/quality-architecture.md](architecture/quality-architecture.md)
- [architecture/platform-overview.md](architecture/platform-overview.md)
- [prompts/README.md](prompts/README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

This file is intentionally concise and points to the detailed governance and standards docs instead of duplicating them.
