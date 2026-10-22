---
name: jira-intelligence
description: "Metadata for Jira story and related-item discovery, requirement context, and Jira-backed traceability."
---

# Jira Intelligence

## Purpose

Describe the existing capability for collecting authoritative Jira story context and related work. This entry documents ownership and interfaces; it does not call Jira or execute a workflow.

## Inputs

- Jira issue key or supported URL
- Acceptance criteria and available linked-item context
- Configured Jira project and test destinations when relevant

## Outputs

- Story snapshot with source identifiers and URLs
- Related-item relationships and historical context
- Requirement analysis and requirement-to-code references when those stages are requested
- Missing or contradictory information recorded as blockers

## Dependencies

- Existing Jira story processing and requirement governance contracts
- Authorized Atlassian MCP integration and repository configuration
- [Jira story processing](../../prompts/jira-story-processing.md)
- [Requirement governance](../../prompts/requirement-governance.md)

## Usage Scenarios

- Discover context for `analyze_story`.
- Identify related stories, enhancements, defects, and development links.
- Establish Jira-backed inputs before test design when explicitly requested.