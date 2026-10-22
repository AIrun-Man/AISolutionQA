# Configuration

Copy `.env.example` only for local reference; the frameworks read process environment values supplied by the shell, CI job, or approved secret store.

## Non-secret configuration

- `TEST_ENV`
- `BASE_URL`
- `API_BASE_URL`
- `STAGING_BASE_URL`
- `STAGING_API_BASE_URL`
- `PRODUCTION_BASE_URL`
- `PRODUCTION_API_BASE_URL`
- `DEV_BASE_URL`, `QA_BASE_URL`, `INT_BASE_URL`, `SIT_BASE_URL`, `UAT_BASE_URL`, `PREPROD_BASE_URL`, `PROD_BASE_URL`
- `DEV_API_BASE_URL`, `QA_API_BASE_URL`, `INT_API_BASE_URL`, `SIT_API_BASE_URL`, `UAT_API_BASE_URL`, `PREPROD_API_BASE_URL`, `PROD_API_BASE_URL`
- `RUN_PLAYWRIGHT_SMOKE`
- `RUN_API_TESTS`

## Secrets

Credentials and tokens must use runtime secret variables such as `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, and `API_TOKEN`. Secret values must not appear in configuration objects, test data, logs, screenshots, traces, reports, or Pull Request content.

`TEST_ENV` accepts DEV, QA, INT, SIT, UAT, PREPROD, PROD, plus the legacy local, test, staging, and production aliases. API environment resolution accepts the same names. New enterprise tiers require their explicit UI/API base URL variable; there is no generic live-target fallback. URLs are validated when configuration is resolved. Environment intelligence records variable names and configured status only, never secret values.

## Governance

`governance-config.json` is the single source for requirement, test, automation, performance, hallucination, privacy, and quality-gate policies. Validate it against `platform-core/schemas/governance-config.schema.json` before analysis. The workflow blocks when the central configuration is absent or invalid; policy thresholds must not be duplicated as code defaults.

For branch-deleted implementation reconstruction, configure `qualityGates.implementationTrust` with `minimumScore`, `blockAmbiguousSources`, `blockUnrelatedCommits`, `blockInvalidMergeCommits`, and `blockIncorrectBranchMappings`. The block is optional for legacy configurations, but reconstruction is blocked when the trust policy is absent. The checked-in policy requires a score of 85 and blocks all four source-integrity findings.

## Generated artifacts

Configure Jira-driven generation in the repository-root `generation-config.json`. Existing `jiraUrl`/`jiraId` and generation flags remain supported. Optionally set `jiraStoryUrl`, `jiraBoardUrl`, `jiraProjectKey`, `testRepositoryPath`, and `testManagementTool` (`Xray`/`XRAY`, `Zephyr`, `TM4J`, or `Native Jira Issue Type`) to route generated cases to Jira. Xray imports use `xrayRepositoryPath`, `xrayCreateStoryFolder`, `xrayStoryFolderPattern`, and `xrayImportFormat` (`JSON` or `CSV`); JSON remains canonical. `xrayAutoImport` is disabled by default. Set `minimumReadinessScore` from 0 to 100 to control the pre-execution readiness gate; it defaults to 80 and is optional for existing configurations. Relative `outputFolder` values resolve from the config file's directory; absolute paths are also supported. UI/API/Performance repository sections are derived from the configured test path and evidence-backed test strategy. Reports and temporary evidence should not be committed; generated automation is published only through the governed automation-repository Pull Request workflow.
