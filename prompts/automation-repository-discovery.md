# Automation Repository Discovery

## Inputs

- `generation-config.json` with configured UI/API automation repositories
- Authorized GitHub repository metadata and acquisition results
- Repository snapshots and immutable revision references, when acquired

## Instructions

Validate the configured repository list. Discover only its repositories. The initial UI repository is `MBSE-GHEC/mbse-test-automation`; the initial API repository is `MBSE-GHEC/mbse-api-test-automation`. Use the connected GitHub integration and inspect its actual tool schema. Acquire/clone a repository only when the requested analysis requires its contents, the integration permits it, and no usable snapshot is already available. Never persist credentials. Record repository owner, purpose, configured ownership, acquisition status, default branch, immutable revision, inventory counts, top-level directories, and warnings. Do not report a complete inventory without a revision-backed snapshot.

Call `discoverAutomationRepositories` and validate configuration with `validateAutomationRepositoryConfiguration`.

## Output

Return an Automation Repository Model and per-repository inventory. Preserve `not-cloned`, `unavailable`, or `unknown` status rather than treating it as an empty repository.