---
name: test-data-intelligence
description: "Metadata for evidence-backed test-data requirements, safe synthetic datasets, and setup/cleanup planning."
---

# Test Data Intelligence

## Purpose

Describe existing analysis of data required by test scenarios, UI fields, API contracts, and explicit implementation dependencies. Data values remain subject to privacy policy.

## Inputs

- Validated requirements, scenarios, and Acceptance-Criteria IDs
- Observed UI fields and journeys
- API operations and request schemas
- Explicit database/service dependencies and approved reusable data inventory
- Synthetic-data policy

## Outputs

- Test-data requirements matrix and scenario dataset references
- Unresolved mandatory data fields and blockers
- Setup and cleanup strategy only when supported by explicit dependency evidence

## Dependencies

- Existing test-data model and schema
- UI discovery, API intelligence, and data privacy governance
- [Test data intelligence](../../prompts/test-data-intelligence.md)
- [Data privacy governance](../../prompts/data-privacy-governance.md)

## Usage Scenarios

- Identify required fields and datasets before test-case or automation generation.
- Reuse approved synthetic data or report unresolved required inputs.
- Carry dataset identifiers into test cases without storing secrets or sensitive values.