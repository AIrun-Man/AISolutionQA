# Coverage Discovery

## Inputs

- Requirement, Acceptance-Criteria, API, UI-component, and business-logic targets
- Active Xray test and automation inventories with explicit traceability links
- Historical coverage with source revision and execution freshness

## Instructions

Call `discoverCoverage` using stable target IDs and explicit links only. Mark whether tests and automation are required for each target. Treat stale, historical-only, inactive, unknown, unavailable, or unlinked assets as non-current evidence. Return covered, partial, and missing rows with their exact Xray and automation IDs and missing evidence kinds. Preserve unknown coverage instead of claiming absence when discovery was incomplete.

## Output

Return a Coverage Discovery Model with target-level evidence and counts.