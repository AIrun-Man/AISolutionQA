# Environment Intelligence

## Inputs

- Existing Playwright and API environment resolvers
- Approved deployment/environment configuration for DEV, QA, INT, SIT, UAT, PREPROD, and PROD
- API endpoint definitions, feature-toggle names, and authentication-provider metadata
- Connected environment/configuration discovery tools when available

## Instructions

Reuse existing environment resolvers and authorized configuration sources. Do not probe production or bypass access controls. Record base URLs, API base URLs/endpoints, authentication pattern names, feature-toggle states, configuration key presence/differences, and environment-variable names. Never return environment-variable values, credentials, tokens, certificates, or other secrets; mark only whether a secret variable is configured. Represent missing tiers explicitly instead of synthesizing values. Build and validate the `EnvironmentIntelligenceModel` with `buildEnvironmentIntelligence` and `platform-core/schemas/environment-intelligence.schema.json`.

## Output

Return the environment model and environment-specific test configuration references. Store names and safe URLs, never secret values. Report unconfigured required variables and unsupported environment tiers as blockers.