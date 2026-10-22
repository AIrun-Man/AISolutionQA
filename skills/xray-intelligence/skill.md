---
name: xray-intelligence
description: "Metadata for Xray repository discovery, test reuse, canonical import artifacts, and execution links."
---

# Xray Intelligence

## Purpose

Describe the existing Xray inventory, reuse, and import capabilities. Analysis and remote creation are distinct; remote changes require their existing authorization and governance gates.

## Inputs

- Validated requirements, scenarios, and Acceptance-Criteria IDs
- Configured Xray repository path, Jira project, and management-tool settings
- Existing Xray tests, executions, coverage, and automation inventory
- Authorized Atlassian/Xray integration when needed

## Outputs

- Repository/folder inventory, execution evidence, duplicates, and coverage delta
- Reuse findings and missing-test recommendations
- Canonical Xray import JSON and optional derived CSV when requested
- Returned Xray identifiers and URLs only after confirmed successful creation

## Dependencies

- Existing Jira/Xray destinations, schemas, and Atlassian integration
- [Xray repository intelligence](../../prompts/xray-repository-intelligence.md)
- [Test reuse intelligence](../../prompts/test-reuse-intelligence.md)
- [Xray import contract](../../prompts/xray-import.md)

## Usage Scenarios

- Inspect existing Xray tests and coverage before generating tests.
- Identify reusable or duplicate test cases.
- Prepare or import missing cases only when explicitly requested and permitted.