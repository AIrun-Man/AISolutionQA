# Reuse-First Generation

## Inputs

- Coverage Discovery and Coverage Delta Models
- Existing Xray tests, automation, utilities, and regression suites
- Approved requirements/scenarios and configured generation flags

## Instructions

Call `buildReuseFirstStrategy` and preserve this order: reuse existing tests; reuse existing automation; extend existing tests; extend existing automation; generate missing test cases; generate missing automation. Use exact active links for reuse. A partial match is extension work. Generate test cases only for uncovered targets and automation only when required automation coverage is missing. Never regenerate existing automation. Preserve existing test-case, Xray, repository, and generation-flag contracts.

## Output

Return Reuse Strategy and Generation Strategy with one action and rationale per target.