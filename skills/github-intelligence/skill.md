---
name: github-intelligence
description: "Metadata for repository, branch, pull-request, commit, and source-impact discovery."
---

# GitHub Intelligence

## Purpose

Describe existing source-control discovery and impact-analysis capabilities. It records evidence and revision identity; it does not access GitHub or change repositories.

## Inputs

- Repository owner/name or URL
- Branch, pull-request, commit, or Jira references
- Existing requirement, test, and automation traceability mappings

## Outputs

- Repository, branch, pull-request, commit, and changed-file references
- Exact source revision and acquisition limitations
- Impacted requirements, tests, automation, modules, and unmapped files

## Dependencies

- Authorized GitHub MCP or explicitly approved existing integration
- Existing source-impact and Jira story processing contracts
- [Source impact analysis](../../prompts/source-impact-analysis.md)
- [Workflow orchestration](../../prompts/workflow-orchestration.md)

## Usage Scenarios

- Discover code references for `analyze_branch`.
- Correlate a Jira story with linked branches, PRs, and commits.
- Assess changed-file impact using existing traceability evidence.