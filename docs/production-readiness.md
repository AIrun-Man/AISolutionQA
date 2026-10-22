# Production Readiness Checklist

## Repository

- Root workspaces install from the lock file.
- TypeScript compilation and strict type checks pass.
- Generated output and secrets are ignored.

## Frameworks

- UI execution uses typed fixtures, semantic waits, governed locators, parallel-safe data, HTML reports, screenshots, video, and traces.
- API execution uses endpoint definitions, encoded parameters, timeout handling, schema validation, sanitized reporting, and strict environments.

## Domain engines

- Requirement, test-case, and discovery structures have schemas and examples.
- Locator governance rejects brittle patterns.
- Traceability validates the complete entity chain.
- Coverage reports explicit gaps and normalized risk.
- Reporting redacts sensitive values.

## CI/CD

- Pull Requests build, lint, test core/API components, and run headless UI validation.
- Protected-branch pushes run regression jobs and publish immutable artifacts.
- Secrets are read only from the execution environment.

## Governance

- Agent instructions are vendor-neutral.
- Pull Request, branch, commit, and review standards exist.
- Prompt outputs require traceability and prohibit invented behavior.
