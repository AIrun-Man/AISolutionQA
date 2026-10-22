---
name: coverage-intelligence
description: "Metadata for requirement, acceptance-criteria, implementation, test, automation, and risk coverage analysis."
---

# Coverage Intelligence

## Purpose

Describe the existing coverage analysis capability using explicit traceability and evidence. Coverage conclusions are not inferred from names or file proximity.

## Inputs

- Requirement analysis and Acceptance-Criteria IDs
- Requirement-to-code mappings and source-impact findings
- Test cases, automation links, execution results, and Xray/reuse evidence
- Prior coverage reports and validated governance configuration when available

## Outputs

- Requirement coverage matrix and code-path coverage mappings
- Missing links, unmapped changes, risks, metrics, and trend deltas
- Pre-automation review or final coverage report according to the requested stage

## Dependencies

- Existing coverage analysis, traceability validation, and reporting components
- Validated central governance configuration for configured thresholds
- [Coverage intelligence](../../prompts/coverage-intelligence.md)
- [Coverage validation](../../prompts/coverage-validation.md)

## Usage Scenarios

- Analyze requirement and implementation coverage gaps.
- Review test-design coverage before automation generation.
- Produce final coverage evidence after automation mappings exist.