---
name: performance-intelligence
description: "Metadata for performance-test strategy, plan validation, and configured environment safety limits."
---

# Performance Intelligence

## Purpose

Describe existing performance planning and governance capabilities. Configured policy determines whether generation or load execution is allowed.

## Inputs

- Performance requirements and proposed load profile
- Target environment and environment model
- Validated `governance-config.json` and generation configuration
- Existing runner support, if any

## Outputs

- Performance strategy and plan
- Governance report with requested values, limits, environment, and findings
- Blockers when performance testing is disabled, unsupported, or exceeds policy

## Dependencies

- Existing automation-strategy and performance-plan validation
- Approved environment and an already configured runner
- [Performance governance](../../prompts/performance-governance.md)
- [Workflow orchestration](../../prompts/workflow-orchestration.md)

## Usage Scenarios

- Assess whether a requirement calls for performance testing.
- Validate a proposed load plan against configured limits before generation.
- Report why a plan cannot be generated or executed without adding a runner.