---
name: commit-reconstruction-intelligence
description: "Metadata for reconstructing implementation changes from linked commits, merge commits, squash merges, and PR diffs."
---

# Commit Reconstruction Intelligence

## Purpose

Describe the future capability for understanding implementation changes when the original feature branch is unavailable. It analyzes discovered source-control evidence and produces an evidence-backed Implementation Reconstruction Model; it does not modify source code.

## Inputs

- Validated Implementation Source Model from Merge Traceability Intelligence
- Repository identity and immutable commit or merge-commit SHAs
- Pull-request diffs, commit history, and changed-file diffs where available
- Relevant source files and surrounding implementation context

## Outputs

- Implementation Reconstruction Model with added, modified, and deleted files
- Evidence-backed findings for API changes, UI component changes, business logic, validations, and data interactions
- Source references, confidence, unresolved mappings, and discovery limitations
- Machine-readable [Implementation Reconstruction Model](../../platform-core/schemas/implementation-reconstruction.schema.json)

## Dependencies

- `merge-traceability-intelligence` and its validated source references
- Authorized access to the identified repository and revisions
- `buildImplementationReconstructionModel` and the [reconstruction schema](../../platform-core/schemas/implementation-reconstruction.schema.json)
- Passing [Implementation Trust report](../../platform-core/schemas/implementation-trust.schema.json)
- Future Capability #109, Commit Reconstruction Intelligence Engine

## Routing Conditions

- Select only after Merge Traceability Intelligence has established usable PR, merge-commit, commit-history, or diff evidence and reconstruction is required.
- Support merge commits, squash merges, individual commits, and pull-request diffs; preserve exact repository and revision provenance.
- Do not infer product behavior from filenames or change status alone. Mark ambiguous intent or incomplete evidence as unresolved.
- If no source revision or usable diff can be established, report the blocker and do not fabricate an implementation model.