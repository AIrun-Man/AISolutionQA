# Engineering Standards

## TypeScript

- Strict typing is mandatory.
- Runtime-loaded data must be validated before use.
- Broad casts, swallowed errors, and success-shaped fallbacks are prohibited.
- Shared logic belongs at the lowest valid architectural layer.

## UI automation

- Locator priority is `getByTestId`, `getByRole`, `getByLabel`, `getByPlaceholder`, CSS, XPath.
- CSS and XPath require documented exceptions.
- Fixed waits and arbitrary positional selection are prohibited.
- Page objects own locators; tests own business assertions; fixtures own lifecycle.

## API automation

- Endpoint definitions are centralized.
- Path and query values are encoded.
- Exact documented statuses, headers, content type, schema, and business outcomes are validated.
- Transport, timeout, contract, and assertion failures remain distinct.

## Traceability and coverage

- Stable IDs and versions are mandatory.
- Missing or stale links are explicit gaps.
- Coverage percentages always include underlying counts.
- Risk scores expose their contributing gaps.

## Reporting

- Results are immutable per revision and attempt.
- Reports preserve failed attempts.
- Sensitive values are redacted before persistence.
- Reporting failures cannot turn failed tests into passing outcomes.
