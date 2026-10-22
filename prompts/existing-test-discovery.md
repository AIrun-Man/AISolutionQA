# Existing Test Discovery

## Inputs

- Revision-backed UI/API automation repositories
- Authorized Xray inventory, test metadata, and suite membership
- Repository test files and explicit traceability metadata

## Instructions

Discover UI tests, API tests, regression suites, smoke suites, and performance suites. Preserve stable test IDs, issue keys, paths, strategy, active/deprecated/unknown status, explicit requirement/Acceptance-Criteria/scenario/API/component/business-logic links, and suite membership. Do not infer coverage from titles or filenames. Report inaccessible repositories, unmapped tests, and unknown status separately.

Call `buildTestInventory` after acquisition and Xray discovery.

## Output

Return Test Inventory, Automation Inventory, and Suite Inventory with repository and revision provenance.