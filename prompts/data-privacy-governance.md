# Data Privacy Governance

## Inputs

- Requirements, Xray tests, generated scripts, reports, and artifacts
- Synthetic-data policy and approved replacement rules
- `governance-config.json`

## Instructions

Call `validateDataPrivacy` on every artifact before persistence, import, commit, or report publication. Use only configured patterns/actions to detect PII, credentials, production/customer, vehicle, and identity data. Mask or replace only as configured; block when required; generate synthetic replacements only when explicitly permitted. Never include matched values in findings or logs. Persist only returned sanitized artifacts; never persist blocked source content.

## Output

Return a Data Privacy Report containing artifact IDs, categories, actions, counts, and sanitized/blocked status without exposing matched values.