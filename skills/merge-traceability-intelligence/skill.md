---
name: merge-traceability-intelligence
description: "Metadata for discovering PR and merge lineage when a story-associated feature branch is absent."
---

# Merge Traceability Intelligence

## Purpose

Describe the future capability for locating implementation lineage after a feature branch has been deleted. It discovers story-associated pull requests and merge commits, then identifies related commits and changed-file references.

## Inputs

- Jira story key and linked development references
- Repository identity and `repositoryContext` from [context.md](../../context.md)
- Feature-branch discovery result from GitHub Intelligence
- Authorized repository and pull-request discovery access

## Outputs

- Implementation source references linking the story to PRs, merge commits, commits, and changed files
- Evidence for each relationship, including stable IDs, repository, revision, and source URL
- Discovery status, unresolved candidates, and access limitations
- Machine-readable [Implementation Source Model](../../platform-core/schemas/implementation-source.schema.json)

## Dependencies

- Existing `github-intelligence` metadata and approved GitHub integration
- `repositoryContext` fields defined in [context.md](../../context.md)
- `discoverImplementationSources` from platform-core and the [source model schema](../../platform-core/schemas/implementation-source.schema.json)
- Future Capability #108, Merge Traceability Intelligence Engine

## Routing Conditions

- Select after GitHub Intelligence confirms that the story-associated feature branch does not exist and implementation lineage is needed.
- Search in order: pull requests associated with the story, merge commits, commits associated with the story, then repository diffs, preserving the priority defined by Future Capability #108.
- Do not select when the branch is confirmed to exist and is usable; follow the direct implementation-intelligence route instead.
- If branch status is `not_checked`, `unknown`, or unavailable, do not treat it as absent. Resolve it through authorized discovery or report the limitation.
- Pass validated commit and diff references to `commit-reconstruction-intelligence` only when usable implementation evidence is found.