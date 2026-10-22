# Agent Orchestration Catalog

## Purpose

This catalog assigns ownership for the intent types defined in [intent.md](intent.md). It describes which agent is responsible for a capability; it does not define agents, dispatch them, execute work, or change existing workflows and integrations.

## Ownership map

```yaml
agent_catalog:
  analyze_story:
    agent: jira-agent
    supporting_agents:
      - github-agent
      - merge-traceability-agent
      - commit-reconstruction-agent
  analyze_branch:
    agent: github-agent
    supporting_agents:
      - merge-traceability-agent
      - commit-reconstruction-agent
  generate_test_cases:
    agent: xray-agent
  generate_xray_tests:
    agent: xray-agent
  generate_ui_automation:
    agent: playwright-agent
  generate_api_automation:
    agent: api-agent
  generate_performance_tests:
    agent: governance-agent
    supporting_agents:
      - api-agent
      - playwright-agent
  run_pipeline:
    agent: governance-agent
    supporting_agents:
      - jira-agent
      - github-agent
      - api-agent
      - playwright-agent
      - xray-agent
      - merge-traceability-agent
      - commit-reconstruction-agent
      - coverage-agent
      - reporting-agent
  generate_report:
    agent: reporting-agent
  analyze_coverage:
    agent: coverage-agent
  analyze_defects:
    agent: jira-agent
    supporting_agents:
      - governance-agent
```

## Ownership notes

- `agent` is the primary ownership label for the intent. `supporting_agents` identifies conditional collaborators; their presence does not imply that they are always needed.
- `merge-traceability-agent` discovers the story-associated feature branch, pull request, and merge commit. Use it when implementation lineage is needed, especially when the feature branch is absent.
- `commit-reconstruction-agent` analyzes the commits identified by traceability, reconstructs implementation changes, and builds the implementation model. It follows merge-traceability discovery when reconstruction is required.
- On a GitHub-backed route, invoke merge traceability and commit reconstruction only after branch discovery confirms the story branch is absent; commit reconstruction requires a passing Implementation Trust result.
- For performance-test generation, `governance-agent` owns policy and safety constraints; `api-agent` or `playwright-agent` supports generation according to the target interface.
- For `run_pipeline`, `governance-agent` owns coordination responsibility. The listed specialists apply only to stages required by the requested pipeline.
- Agent assignment expresses responsibility, not execution authorization. User scope, available context, existing workflow contracts, permissions, and governance continue to control any action.