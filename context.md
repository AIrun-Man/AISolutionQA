# Context Discovery Layer

## Purpose

This document defines a lightweight context record for identifying what evidence is available before execution. It complements the [intent classification layer](intent.md): intent describes what the user requests; context records which relevant sources and artifacts were found.

Context discovery records evidence availability only; it does not execute integrations or workflows. The progressive disclosure router consumes these facts to choose the appropriate existing intelligence path while preserving workflow contracts and governance.

## Context contract

```yaml
context:
  jira:
    available: available
    story:
      key: NEXUS-2807
      reference: https://jira.example/browse/NEXUS-2807
    related_items:
      available: not_checked
      items: []
  github:
    available: available
    repository: owner/repository
    pull_request:
      available: unavailable
      reference: null
    commits:
      available: available
      references:
        - abc1234
  branch:
    available: available
    name: feature/NEXUS-2807
  repositoryContext:
    branchExists:
      status: available
      value: true
      references:
        - feature/NEXUS-2807
    pullRequestExists:
      status: not_checked
      value: null
      references: []
    mergeCommitExists:
      status: not_checked
      value: null
      references: []
    commitHistoryAvailable:
      status: not_checked
      value: null
      references: []
    reconstructionRequired:
      status: available
      value: false
      references: []
  api_contract:
    available: not_checked
    references: []
  adr:
    available: unavailable
    references: []
  xray:
    available: not_checked
    references: []
  existing_tests:
    available: available
    references:
      - path/to/test-case-or-suite
  existing_automation:
    available: available
    references:
      - path/to/automation
  automation_repositories:
    available: not_checked
    references: []
  framework_intelligence:
    available: not_checked
    references: []
  repository_standards:
    available: not_checked
    references: []
  pipeline_execution:
    available: not_checked
    references: []
  existing_test_inventory:
    available: not_checked
    references: []
  suite_inventory:
    available: not_checked
    references: []
  coverage_discovery:
    available: not_checked
    references: []
  regression_impact:
    available: not_checked
    references: []
  coverage_delta:
    available: not_checked
    references: []
  reuse_governance:
    available: not_checked
    references: []
```

Use these values for each `available` field:

- `available`: the source or artifact was found and has a usable reference.
- `unavailable`: discovery was performed and confirmed it was not found or accessible.
- `not_checked`: discovery has not been performed.
- `unknown`: discovery was attempted but did not establish availability.

Each `repositoryContext` field contains:

- `status`: `available` when the check completed, `not_checked` when it has not run, `unavailable` when the source could not be accessed, or `unknown` when discovery was inconclusive.
- `value`: `true` or `false` only when the result is known; use `null` for `not_checked`, `unavailable`, or `unknown`.
- `references`: branch names, PR URLs, merge commit SHAs, or commit-history sources supporting the result.

`reconstructionRequired.value` is `true` when the story-associated feature branch was confirmed absent and implementation evidence must be recovered from lower-priority sources. It is `false` when a usable story-associated branch exists. Keep it `null` until branch discovery establishes the result. These fields describe discovery facts for orchestration; they do not execute a discovery strategy or replace the priority rules in the existing workflow contracts.

References should identify the source precisely, such as a Jira key or URL, repository/branch, pull-request URL, commit SHA, contract location, ADR path, Xray project/repository, test identifier, or automation path. Do not include credentials or secret values.

## Discovery rules

- Record observed evidence only. Do not infer that an artifact exists because a request mentions it.
- Distinguish `unavailable` from `not_checked`; an empty reference list alone does not mean discovery confirmed absence.
- Preserve stable identifiers and source locations where available. Note access or discovery limitations as `unknown` rather than reporting absence.
- This record reports context availability only. It does not determine execution readiness, authorize side effects, or imply that any listed capability has run.