# Source Code Impact Analysis

## Inputs

- Pull Request base and head refs, or a commit range
- Existing requirement/test/automation traceability mappings
- Repository instructions and affected source context

## Instructions

1. Use authenticated `gh` CLI in the Devin environment to read PR changed paths or compare the requested revisions. Do not use local-host authentication implicitly.
2. Build mappings only from repository evidence: traceability records, test imports/fixtures/page objects, API endpoint usage, and explicit test metadata.
3. Call `analyzeSourceImpact` with changed paths and those mappings.
4. Keep unmapped files visible. Do not assume an unmapped code file has no impact; recommend full regression when impact cannot be established.

## Output

Persist `impact-analysis.json` with `writeJiraArtifactJson` in the configured `<outputFolder>/<JIRA-ID>/` folder. Report impacted modules, requirements, test cases, automations, unmapped files, and the evidence used to create each mapping.