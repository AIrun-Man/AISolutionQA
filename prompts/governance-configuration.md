# Governance Configuration

## Inputs

- Repository-root `governance-config.json`
- `platform-core/schemas/governance-config.schema.json`

## Instructions

Load policies with `loadGovernanceConfig` and validate before analysis or generation. All thresholds, severity choices, pattern rules, and blocking behavior must come from this file. Do not add code-level fallback thresholds. Keep UI/API/Performance configuration separate from secret values; governance configuration must contain no credentials. Reject unknown or malformed policy values and report the exact configuration path and field.

## Output

Return the validated versioned GovernanceConfig and a configuration validation result. Stop the workflow if validation fails.