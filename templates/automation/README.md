# Automation Templates

Templates use `{{placeholder}}` tokens and are generation contracts, not executable source files.

- `page-object.ts.template` keeps locators and interactions in page objects.
- `test.ts.template` keeps business assertions in tests.
- `fixture.ts.template` composes typed runtime dependencies.
- `api-test.ts.template` uses service clients and response validators.

Generated output must replace every token, satisfy repository typing, and preserve requirement-to-test-to-automation traceability.
