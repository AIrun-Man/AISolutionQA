---
name: governance
description: "Metadata for configuration-backed requirement, test, script, privacy, performance, and enterprise quality gates."
---

# Governance

## Purpose

Describe existing policy validation and quality-gate capabilities. The validated repository configuration is authoritative; missing policy is not replaced with guessed defaults.

## Inputs

- `governance-config.json` and its schema
- Requirement, test, automation, performance, privacy, hallucination, coverage, and readiness reports as applicable
- Implementation Trust report and configured trust policy when source reconstruction is required
- [Implementation Trust schema](../../platform-core/schemas/implementation-trust.schema.json)
- Requested operation and its configured thresholds

## Outputs

- Validation findings and policy decisions
- PASS, WARNING, or BLOCK readiness status where the enterprise gate applies
- Actionable blockers and configured threshold evidence
- Implementation Trust Score with source-mapping, merge validity, lineage, ambiguity, and unrelated-commit findings

## Dependencies

- Existing deterministic governance engines and schemas
- Requirement, script, performance, privacy, and enterprise quality-gate contracts
- [Enterprise quality gate](../../prompts/enterprise-quality-gate.md)
- [Performance governance](../../prompts/performance-governance.md)

## Usage Scenarios

- Validate requirements or generated assets against configured policy.
- Check readiness before an authorized execution or publication stage.
- Explain a policy blocker using observed values and configured thresholds.
- Block reconstruction-dependent execution when trust evidence or configured trust policy is missing, below threshold, or critically inconsistent.