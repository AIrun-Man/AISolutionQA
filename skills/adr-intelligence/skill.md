---
name: adr-intelligence
description: "Metadata for discovering architecture decision records and treating them as supporting evidence."
---

# ADR Intelligence

## Purpose

Describe discovery of architecture decision records (ADRs) relevant to a requirement or implementation. ADRs supplement current requirements and code; they do not override them.

## Inputs

- Repository and exact branch or revision
- Requirement, feature, or changed-code context
- Candidate ADR locations

## Outputs

- ADR availability and source paths
- Relevant decision references and concise supporting context
- Discovery limitations or confirmed absence

## Dependencies

- Existing repository access and source revision context
- ADR search locations defined by [Jira story processing](../../prompts/jira-story-processing.md) and [workflow orchestration](../../prompts/workflow-orchestration.md)
- Evidence precedence: requirements, implementation, API contracts, then ADRs

## Usage Scenarios

- Check whether a repository contains decisions relevant to a story or branch.
- Add supporting architecture context to code analysis.
- Record ADR discovery as unavailable without blocking when none are found.