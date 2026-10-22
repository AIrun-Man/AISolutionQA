---
name: reporting
description: "Metadata for existing sanitized execution, coverage, API, and executive reporting capabilities."
---

# Reporting

## Purpose

Describe the existing reporting layer that turns validated results and evidence into configured artifacts. Reports preserve outcomes and do not change them.

## Inputs

- Execution identity, source revision, environment, and attempt
- Validated test results, sanitized evidence, coverage, traceability, and governance findings
- Configured output root and applicable report contract

## Outputs

- Machine-readable JSON summaries and artifact manifests
- HTML indexes, dashboards, and executive summaries where supported
- Artifact references and documented gaps or unavailable evidence

## Dependencies

- Existing platform-core reporting generators and configured artifact storage
- `generation-config.json` for Jira-driven output paths
- [Reporting standard](../../docs/reporting-standard.md)
- [Coverage intelligence](../../prompts/coverage-intelligence.md)

## Usage Scenarios

- Generate reports from completed, validated execution results.
- Produce coverage or API dashboards using their existing report contracts.
- Locate evidence by execution, revision, environment, and attempt.