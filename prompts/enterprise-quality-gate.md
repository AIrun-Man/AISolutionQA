# Enterprise Quality Gate

## Inputs

- Requirement, Test, Automation, Performance, and Implementation Trust Governance Reports when applicable
- Hallucination Detection and Data Privacy Reports
- Coverage Intelligence and Story Readiness reports
- Security findings, duplicate counts, and `governance-config.json`

## Instructions

Call `evaluateEnterpriseQualityGate` after all pre-execution reports exist and before branch creation, commits, Pull Request creation, or GitHub Actions. Apply only thresholds and block switches from the validated central config. Include configured requirement confidence, requirement/Acceptance-Criteria/risk/API/contract coverage, readiness, duplicate tests, hallucinations, security/privacy violations, and critical findings. When the story branch is confirmed absent and implementation reconstruction is used, include the Implementation Trust report and configured `qualityGates.implementationTrust` policy; missing trust evidence, mapping conflicts, invalid merge evidence, unrelated commits, or a score below threshold must block readiness. A missing required report or failed required gate is not a pass. Call `assertExecutionReady` before any execution-side effect.

## Output

Persist the Execution Readiness Report with PASS/WARNING/BLOCK, each gate's observed value and configured threshold, findings, and Go/No-Go decision. BLOCK prohibits commits, Pull Request creation, Actions dispatch, and Xray/Jira updates. WARNING proceeds only when config permits warnings.