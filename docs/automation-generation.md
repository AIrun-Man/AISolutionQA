# Automation Generation Standards

Generated automation must consume approved test cases, discovery data, locator assessments, and API contracts.

For Jira Stories, load `generation-config.json`, honor its UI/API/performance flags, and resolve all generated artifacts under `<outputFolder>/<JIRA-ID>/`. Store scripts, locators, variables, and reports in their configured UI/API folders. Never embed secrets in variable files.

## Page objects

- Model one page or reusable component.
- Own semantic locators and atomic interactions.
- Expose business-readable methods.
- Contain no scenario assertions or environment secrets.

## Tests

- Verify one coherent business outcome.
- Use typed fixtures and controlled data.
- Use explicit, user-observable assertions.
- Preserve test-case identifiers in metadata or naming.

## Fixtures

- Compose page objects, clients, authentication, test data, and cleanup.
- Match scope to resource lifetime.
- Remain safe under parallel execution.

## Error and wait policy

- Preserve underlying causes and add operation context.
- Never swallow failures or continue with empty fallback data.
- Use Playwright auto-waiting and observable state transitions.
- Do not generate fixed delays.
