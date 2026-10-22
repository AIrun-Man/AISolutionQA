# Smart Regression Suite Builder

## Inputs

- Changed files, APIs, components, and business-logic IDs
- Regression Impact and Coverage Delta Models
- Existing smoke, functional, regression, API, and performance suites
- Existing test inventory and execution evidence
- Explicit target environment and Safe Agile PI/ART context, when supplied

## Instructions

Call `buildSmartRegressionRecommendation`. Recommend only active tests from existing suites and explicitly impacted tests. Produce smoke, functional, regression, API, and performance test IDs with rationale. Preserve the supplied environment, release train, REX/RAM ART, and Program Increment context for PI validation; never infer these values. Unmapped changed files require full regression. Do not create or modify suites. Keep performance tests subject to existing performance governance and environment limits.

## Output

Return an Execution Recommendation with tests, suites, repositories, rationale, and full-regression warnings.