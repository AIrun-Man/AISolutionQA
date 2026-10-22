---
name: api-intelligence
description: "Metadata for API contract discovery, requirement/code correlation, risk, coverage, and automation planning."
---

# API Intelligence

## Purpose

Describe the existing API intelligence capability for analyzing contracts, implementation evidence, and API test coverage without inventing operations or behavior.

## Inputs

- Validated requirement analysis and Acceptance Criteria
- Exact repository branch, PR, commit, and code diff
- Authorized API portal or repository contract sources
- Existing endpoint definitions, schemas, tests, and generation configuration

## Outputs

- Normalized API operations and contract source references
- Requirement-to-operation and operation-to-code mappings
- Coverage, risk, unresolved mappings, and per-operation automation plans
- API intelligence report conforming to the existing schema

## Dependencies

- Authorized portal, Jira, and GitHub integrations when applicable
- Existing API framework clients, request builder, schemas, validators, and reporting
- [API intelligence contract](../../prompts/api-intelligence.md)
- [API automation generation](../../prompts/api-automation-generation.md)

## Usage Scenarios

- Discover and analyze APIs affected by a story or branch.
- Identify contract, validation, error, authentication, and authorization coverage gaps.
- Plan API tests or automation using the existing framework when requested.