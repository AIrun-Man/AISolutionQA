# Script Governance

## Inputs

- Generated UI/API/performance scripts
- Existing framework standards, page objects, utilities, and locator inventory
- Test-case and evidence traceability
- `governance-config.json`

## Instructions

Call `validateAutomationScripts` on every generated script before staging or committing. Check configured naming and framework compliance, required page objects, utility reuse, assertions, test traceability, duplicate scripts/locators, and every configured prohibited pattern. Treat hardcoded waits, credentials, or framework bypasses at their configured severity. Do not auto-fix by weakening assertions or bypassing the framework.

## Output

Return an Automation Governance Report with script paths, violated rule IDs, severities, evidence, and status. Do not stage or commit blocked scripts.