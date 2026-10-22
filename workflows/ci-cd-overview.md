# CI/CD Overview

## Pull Requests

1. Restore locked dependencies.
2. Lint and compile every workspace.
3. Run core and API unit tests.
4. Install Chromium and execute headless UI tests.
5. Upload UI evidence even on failure.

Superseded runs for the same Pull Request are cancelled.

## Protected branch pushes

1. Validate and compile.
2. Run API and browser regressions in parallel.
3. Execute Chromium and Firefox as independent matrix jobs.
4. Upload API/UI reports using commit and attempt identities.
5. Enforce one final quality gate.

Repository variables select live example execution and target URLs. Credentials must be supplied through encrypted secrets and consumed only by fixtures or authentication providers.
