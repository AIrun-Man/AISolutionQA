# Pipeline Intelligence

## Inputs

- Revision-backed GitHub Actions workflow files from configured automation repositories
- Workflow triggers, parsed execution commands, environment-variable names, report mechanisms, artifacts, and action references

## Instructions

Inspect actual workflow files and report triggers, commands, environment-variable names only, reports, artifacts, and action references. Never expose secret values. Validate action references against the repository's configured compatibility policy; an absent workflow is unknown/not configured, not compatible. Preserve execution ordering and report unsupported or unpinned actions as findings. Do not dispatch a workflow during discovery.

Call `analyzePipelineIntelligence`.

## Output

Return a Pipeline Execution Model and GitHub Actions compatibility findings tied to repository revision and workflow path.