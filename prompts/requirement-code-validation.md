# Requirement Versus Code Validation

## Inputs

- Validated requirement-analysis JSON
- Current repository revision
- Source files relevant to the requirement

## Instructions

1. Read the relevant implementation and tests; do not rely on filenames or keyword matches alone.
2. Call `validateRequirementsAgainstCode` with the validated analysis and inspected source-file contents.
3. Review each result against code context. Keep `implemented`, `partially-implemented`, or `missing` aligned with evidence; do not upgrade a lexical match without a behavior path.
4. Record unmapped or unreviewed requirements as unresolved rather than implemented.

## Output

Persist the machine-readable report with `writeJiraArtifactJson` as `requirement-code-validation.json` in the configured `<outputFolder>/<JIRA-ID>/` folder. Include evidence files, matched terms, confidence, and a reviewer-ready list of missing or partial requirements.