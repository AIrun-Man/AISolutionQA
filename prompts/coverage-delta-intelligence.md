# Coverage Delta Intelligence

## Inputs

- Existing Coverage Discovery Model
- New implementation target IDs, changed files/APIs/components/business-logic evidence
- Current Xray and automation inventories with source revision

## Instructions

Call `analyzeCoverageDelta`. Compare current explicit coverage with the new implementation. Classify each target as already covered, partially covered, or missing, and isolate impacted covered/partial/missing target IDs. Historical baselines do not count as current passing coverage. Do not create Xray cases or automation during delta analysis.

## Output

Return a Coverage Delta Model with evidence references and unresolved targets.