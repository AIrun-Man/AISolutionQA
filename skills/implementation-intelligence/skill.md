---
name: implementation-intelligence
description: "Metadata for analyzing an approved source revision and mapping implementation behavior to requirements."
---

# Implementation Intelligence

## Purpose

Describe the existing implementation-analysis capability that interprets changed code against validated requirements and source evidence. It reuses the repository's analysis, impact, and requirement-code validation engines; it does not infer behavior from file names alone.

## Inputs

- Validated Jira requirements and Acceptance Criteria
- Approved repository, branch/commit, or trusted reconstruction source
- Changed-file evidence and relevant implementation context
- Existing requirement-to-code mappings, when available

## Outputs

- Added, modified, and deleted file findings with implementation intent
- API, UI, validation, business-logic, data, and error-handling findings when supported by evidence
- Requirement-to-code mappings, source-impact results, confidence, and unresolved gaps

## Dependencies


 [Implementation Source Model](../../platform-core/schemas/implementation-source.schema.json) and [Implementation Reconstruction Model](../../platform-core/schemas/implementation-reconstruction.schema.json) when source lineage is reconstructed

- Select after GitHub Intelligence confirms a usable story-associated feature branch or source revision.
- If the branch is confirmed absent, select only after merge traceability finds usable evidence and implementation trust passes; consume the resulting reconstruction model.
- Do not analyze an ambiguous, unrelated, or untrusted source as the story's implementation.