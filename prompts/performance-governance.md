# Performance Governance

## Inputs

- Performance plan and load profile
- Target environment and environment model
- `governance-config.json`

## Instructions

Call `validatePerformancePlan` before generating or executing performance tests. Enforce the configured maxima for users, duration, ramp rate, request rate, test size, and parallel runs. Enforce the configured environment allow-list and production policy. Do not dispatch load when any configured limit is exceeded or performance testing is disabled.

## Output

Return a Performance Governance Report showing each requested value, configured limit, environment, and finding. BLOCK means no test generation/execution.