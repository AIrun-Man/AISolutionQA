# Intent Classification Layer

## Purpose

This document defines a lightweight architectural entry point for classifying user requests and producing structured intent metadata. It sits above the existing architecture and supports progressive disclosure by identifying which existing capabilities are relevant.

Classification is descriptive only. It does not execute a capability, change stage order, enable a generation flag, bypass governance, or modify existing workflows. Existing prompts, configuration, schemas, integrations, and governance remain authoritative. See the [prompt library](prompts/README.md) and [workflow orchestration contract](prompts/workflow-orchestration.md).

## Metadata contract

```yaml
intent:
  type: analyze_story
  confidence: 0.94
  required_capabilities:
    - jira-story-processing
    - requirement-governance
    - requirement-analysis
  execution_mode: analyze_only
```

- `type` is one supported intent below.
- `confidence` is a value from `0.0` to `1.0` expressing classification confidence, not execution readiness.
- `required_capabilities` lists only the existing capabilities needed for the request; it does not imply that they were run.
- `execution_mode` describes the requested scope: `analyze_only`, `generate_only`, `execute_requested`, or `report_only`. It is not permission to perform unrequested side effects.

## Supported intents

| Intent | Required capabilities to consider | Typical mode |
|---|---|---|
| `analyze_story` | `jira-story-processing`, `requirement-governance`, `requirement-analysis`; source-lineage capabilities when implementation analysis is requested | `analyze_only` |
| `analyze_branch` | `code-analysis`, `source-impact-analysis`, `requirement-code-validation`; merge-traceability and reconstruction when the story branch is confirmed missing | `analyze_only` |
| `generate_test_cases` | `existing-test-intelligence`, `xray-repository-intelligence`, `test-reuse-intelligence`, `coverage-discovery`, `coverage-delta-intelligence`, `reuse-first-generation`, `scenario-generation`, `test-case-generation`, `test-generation-governance` | `generate_only` |
| `generate_xray_tests` | `existing-test-intelligence`, `xray-repository-intelligence`, `existing-test-discovery`, `coverage-delta-intelligence`, `reuse-first-generation`, `xray-import` | `generate_only` |
| `generate_ui_automation` | `existing-test-intelligence`, `xray-repository-intelligence`, `automation-repository-discovery`, `framework-intelligence`, `repository-standards-intelligence`, `pipeline-intelligence`, `existing-automation-intelligence`, `regression-impact-intelligence`, `coverage-delta-intelligence`, `reuse-first-generation`, `ui-automation-generation`, `script-governance` | `generate_only` |
| `generate_api_automation` | `existing-test-intelligence`, `xray-repository-intelligence`, `automation-repository-discovery`, `framework-intelligence`, `repository-standards-intelligence`, `pipeline-intelligence`, `existing-automation-intelligence`, `regression-impact-intelligence`, `coverage-delta-intelligence`, `reuse-first-generation`, `api-automation-generation`, `script-governance` | `generate_only` |
| `generate_performance_tests` | `existing-test-intelligence`, `xray-repository-intelligence`, `automation-repository-discovery`, `framework-intelligence`, `repository-standards-intelligence`, `pipeline-intelligence`, `existing-automation-intelligence`, `regression-impact-intelligence`, `coverage-delta-intelligence`, `reuse-first-generation`, `automation-strategy-selection`, `performance-governance`, `script-governance` | `generate_only` |
| `run_pipeline` | `workflow-orchestration`, `existing-test-intelligence`, `xray-repository-intelligence`, `test-reuse-intelligence`, `reuse-governance`, `smart-regression-suite-builder`, and capabilities required by requested stages | `execute_requested` |
| `generate_report` | `reporting` and the relevant report contract | `report_only` |
| `analyze_coverage` | `existing-test-intelligence`, `xray-repository-intelligence`, `coverage-discovery`, `regression-impact-intelligence`, `coverage-delta-intelligence`, `coverage-intelligence`, `coverage-validation` | `analyze_only` |
| `analyze_defects` | `failure-analysis`; `jira-defect-sync` only when defect synchronization is explicitly requested | `analyze_only` |

Capability names correspond to existing prompt contracts or platform capabilities; consult the [prompt library](prompts/README.md) for the authoritative prompt names and outputs. Select only capabilities relevant to the user's request and available evidence.

## Classification rules

- Classify the requested outcome, not merely the nouns mentioned in the request. For compound requests, use `run_pipeline` only when the user explicitly asks to run an end-to-end pipeline; otherwise classify the primary requested outcome.
- Preserve the distinction between analysis, artifact generation, execution, and reporting. Do not upgrade a request to a more side-effectful mode.
- If the intent or requested scope is materially ambiguous, return the best-supported classification with reduced confidence and ask for clarification before consequential action.
- Capability selection does not satisfy capability-specific prerequisites. Downstream workflows must still validate inputs, configuration, permissions, and governance as defined by their existing contracts.