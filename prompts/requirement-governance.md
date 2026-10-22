# Requirement Governance

## Inputs

- Jira Story and authoritative Acceptance Criteria
- Historical duplicate candidates and their confidence scores
- Requirement dependency and business-context inventory
- `governance-config.json`

## Instructions

Load and validate `governance-config.json` before requirement analysis. Call `validateRequirementsBeforeAnalysis` with the raw Jira story key/summary/description, Acceptance Criteria, business rules, confidence evidence, required business-context fields, dependencies, conflicts, and duplicate-story candidates before calling `analyzeRequirements`. Do not infer missing context. Block analysis when Acceptance Criteria are absent, confidence is below the configured minimum, duplicate confidence exceeds its threshold, required dependencies/business context are missing, or conflicts remain unresolved. Persist the Requirement Governance Report under the configured story output path.

## Output

Return the configured requirement quality score, every finding and evidence reference, and PASS/WARNING/BLOCK status. Conform to the governance report model; do not proceed to requirement analysis on BLOCK.