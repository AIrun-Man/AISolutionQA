# Read-Only Knowledge Layer

## Purpose

This document defines a read-only catalog of references to previously established quality-engineering knowledge. It supports duplicate-test prevention, existing-coverage discovery, and automation reuse by pointing to authoritative artifacts rather than treating prior outputs as new truth.

This layer does not learn, ingest, write, update, delete, or synchronize knowledge. It does not create Jira/Xray items, modify tests, or change existing workflows. The initial implementation is this documentation contract only.

## Knowledge categories

| Category | References to retain |
|---|---|
| Historical Stories | Jira issue keys/URLs, relationships, source requirements, and linked implementation revisions |
| Historical Coverage | Coverage artifact reference, requirement/scenario links, source revision, execution identity, and freshness/status |
| Existing Xray Tests | Xray issue key/URL, scenario and Acceptance-Criteria links, source Story, repository/folder, and current status |
| Existing Automation | Test/scenario IDs, repository path, framework, source revision, and linked Xray or requirement identifiers |
| Defect History | Defect key/URL, related story/test/implementation references, status, and relevant failure classification |
| Reusable Patterns | Reference to an existing approved pattern, its evidence/source, scope, and known limitations |
| Historical PRs | PR number/URL, repository, source and target branches, merge status/type, and linked Jira story keys |
| Merge Commit References | Merge commit SHA, repository, parent/base revisions, associated PR, and changed-file diff reference |
| Commit Lineage | Ordered commit SHAs, parent relationships, repository, and relationship to a PR or merge commit |
| Story-to-Commit Relationships | Jira story key, evidence-backed relationship type, linked PR/merge/commit references, and source locations |
| Automation Repository Inventory | Configured repository, purpose, ownership, acquisition status, immutable revision, and inventory artifact reference |
| Framework and Repository Standards | Repository revision, language/framework/pattern findings, standards evidence paths, and model reference |
| Pipeline Execution | Repository revision, workflow paths, execution/report/artifact references, and compatibility findings |
| Existing Test and Suite Inventories | Xray/test identifiers, automation paths, suite membership, source revision, status, and inventory reference |
| Coverage Discovery and Delta | Target IDs, explicit test/automation links, source revision, current status, and analysis artifact reference |
| Regression Impact and Reuse | Changed source/API/component links, impacted tests/suites, reuse decisions, and execution recommendation reference |

## Reference record

Knowledge entries are references to existing artifacts. This example describes metadata only; it does not establish a storage format or persistence mechanism.

```yaml
memory:
  mode: read_only
  entries:
    - id: xray:PROJ-1234
      category: existing_xray_test
      source: https://jira.example/browse/PROJ-1234
      source_story: PROJ-1000
      scenario_ids:
        - SC-01
      acceptance_criteria:
        - AC-02
      source_revision: abc1234
      status: active
      observed_at: 2026-10-14T00:00:00Z
    - id: lineage:PROJ-1000:merge-abc987
      category: story_to_commit_relationship
      story_key: PROJ-1000
      repository: owner/repository
      pull_request:
        reference: https://github.example/owner/repository/pull/42
        merge_type: squash
      merge_commit:
        sha: abc987
        parents:
          - def654
      commit_lineage:
        - sha: abc987
          relationship: merged_as
      changed_files_reference: https://github.example/owner/repository/commit/abc987
      evidence:
        - type: pull_request_story_link
          reference: https://github.example/owner/repository/pull/42
        - type: merge_commit
          reference: https://github.example/owner/repository/commit/abc987
      status: verified
      observed_at: 2026-10-14T00:00:00Z
```

Retain stable identifiers, source links, source revision where relevant, observed time, and status. Do not copy credentials, secrets, or unrestricted personal data into this index. If provenance or freshness cannot be established, mark it unknown rather than inferring it.

## Read-only usage

The router consults this catalog on every request and performs category-specific retrieval when needed. The following checks are mandatory before making reuse or coverage decisions:

- Before proposing new test cases or Xray tests, check historical story context, existing Xray tests, and linked coverage for exact scenario and Acceptance-Criteria matches.
- Before generating UI, API, or performance automation, check for active existing automation with explicit test/scenario and requirement links.
- Before any test or automation generation, discover configured repositories, frameworks, repository standards, pipelines, existing Xray tests, automation, suites, and coverage. Record unavailable sources; do not treat them as empty inventories.
- Before analyzing or reusing coverage, retrieve prior coverage references and compare source revision, execution identity, status, and freshness. Reuse historical coverage as a baseline only; do not treat it as current passing evidence.
- When a feature branch is absent, consult historical PRs, merge commit references, commit lineage, and story-to-commit relationships as discovery leads. Validate each relationship against authoritative repository/PR evidence before using it.

### Duplicate test prevention

- Consult existing Xray and test-reuse references before proposing new test cases.
- Treat a test as an exact reuse match only when the existing reuse contract's scenario or normalized-title and explicit Acceptance-Criteria conditions are met.
- Preserve source Story identity. An Acceptance-Criteria identifier from another Story is not equivalent without an explicit mapping.
- Treat partial overlap as a reuse/extension candidate, not proof that the requested behavior is already covered.

### Existing coverage discovery

- Retrieve coverage references with their requirement, scenario, code-path, source-revision, and execution links.
- Count only explicit, current links as current coverage. Historical-only, stale, deprecated, or unknown-status evidence is not current passing coverage.
- Keep missing mappings and unavailable history visible; do not infer coverage from names or file paths.

### Existing automation reuse

- Locate automation through explicit test/scenario and requirement links, retaining repository path and source revision.
- Reuse only active, traceable assets. Report partial matches as extension work and missing links as unresolved.
- A reference to automation does not authorize modifying, executing, or publishing it.

Defect history and reusable patterns may inform analysis as supporting evidence, but must not override current requirements, implementation, contracts, or observed execution results.

Historical PR and commit references support lineage discovery, including squash and merge commits. They are leads, not proof by themselves; preserve ambiguous relationships as unresolved and verify the exact repository and revision before reconstructing implementation.

## Dependencies

- Existing test-reuse, Xray repository, coverage, and test-maintenance contracts
- Authoritative Jira, Xray, repository, execution, and coverage artifacts, when available
- [Test reuse intelligence](prompts/test-reuse-intelligence.md)
- [Xray repository intelligence](prompts/xray-repository-intelligence.md)
- [Coverage intelligence](prompts/coverage-intelligence.md)
- [Test maintenance intelligence](prompts/test-maintenance.md)

## Non-goals

- No automatic learning, memory updates, ingestion, synchronization, or retention policy
- No creation, mutation, deletion, or quarantine of tests, automation, Jira issues, or Xray assets
- No replacement for existing test-reuse, coverage, defect, governance, or workflow implementations
- No inference that referenced historical results remain valid for the current revision