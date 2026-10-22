# Regression Impact Intelligence

## Inputs

- Jira Story, PR/merge/commit lineage, exact changed files, changed API IDs, UI components, and business-logic IDs
- Test Inventory and suite membership
- Implementation Trust result when source reconstruction was needed

## Instructions

Call `analyzeRegressionImpact` with explicit source and test mappings. Return impacted tests, suites, repositories, and scope. Do not map by filename similarity. If a changed file cannot be mapped to an active test, mark it unmatched and require full regression; preserve ambiguous lineage as a blocker.

## Output

Return a Regression Impact Model with unmatched changes and the full-regression decision.