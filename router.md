# Progressive Disclosure Router

## Purpose

Route every user request through the existing [intent catalog](intent.md), [context catalog](context.md), [agent ownership catalog](agents.md), [read-only knowledge catalog](memory.md), and [skill catalog](skills/). Select only the intelligence skill metadata required for that request. The executable selector is in [progressive-disclosure.ts](platform-core/src/workflow/progressive-disclosure.ts); it does not execute capability engines or replace existing capability implementations.

## Routing Workflow

1. Classify every request using `intent.md`. For an unsupported or ambiguous request, record the routing value as `unclassified`; do not invent a new supported intent.
2. Use `context.md` to record availability for evidence relevant to the request. Leave unrelated sources `not_checked`; do not treat that state as unavailable or infer evidence.
3. Consult `agents.md` for ownership. Record the mapped owner, or `no_catalog_match` when no owner is defined; do not invent or dispatch an agent.
4. Consult `memory.md` on every route to determine which read-only knowledge categories apply. Retrieve only relevant references. Before any test or automation generation, discover configured automation repositories, existing tests/Xray tests, automation assets, suites, and coverage. Do not infer that the documentation example is populated memory data.
5. Select the route's required skills below. Always include `governance`; add other default and conditional skills only when the request or available context requires them.
6. Read only the selected `skills/<name>/skill.md` files. Do not enumerate or load all skill documents.
7. From the selected skills' `Dependencies` sections, load only the existing prompt contracts needed for the requested output or next workflow stage. Do not load every prompt linked by a selected skill.
8. Apply existing configuration, governance gates, and workflow contracts for the requested work. Skill metadata is progressive-disclosure context, not a replacement for those contracts.

Return a concise route record containing the intent type or `unclassified`, relevant context availability, mapped owner or `no_catalog_match`, applicable memory categories and lookup status, selected skills, selected prompt contracts, governance applicability/outcome, and fallback when used. Do not claim that a skill or capability was executed merely because its metadata was consulted.

## Evidence-Aware Selection

- Use `context.md` availability for source selection. For `available`, use the referenced evidence and avoid rediscovery unless validation is needed. For `not_checked`, discover only sources needed by the requested operation, using approved existing integrations. For `unavailable` or `unknown`, preserve the gap and do not infer evidence.
- Do not skip a required domain skill merely because a required source is `not_checked`; select the skill needed to perform the authorized discovery. If the source is confirmed unavailable, do not load unrelated skills as compensation; use the existing workflow's blocker or fallback behavior.
- Omit optional skills when neither the requested outcome nor available context needs their capability. Do not load a domain skill just because its source category is present if the requested operation does not use it.
- Resolve intent, evidence, owner, memory applicability, and skill selection independently. Mentioned systems do not automatically become required capabilities.

## Prompt Disclosure

- Load the selected skill metadata first, then follow only the prompt dependencies relevant to the current requested output and workflow stage.
- Preserve established prompt inputs, outputs, and prerequisites. Use the approved workflow plan order: implementation analysis, Existing Test Intelligence, coverage/reuse analysis, missing-only generation, smart regression recommendation, governance, execution recommendation, and Actions compatibility. Progressive disclosure does not replace capability behavior.
- When no supported intent or usable route exists, do not load every skill or prompt. Continue with the existing prompt/workflow path and record the fallback.

## Governance Record

- Select the `governance` skill on every route and inspect the applicable repository policy before consequential analysis, generation, persistence, import, execution, or publication.
- Run the existing configured gate(s) required for the requested stage. A gate is mandatory when its workflow contract requires it; stop the affected stage on a blocking or failed result.
- Record gate name and result only when actually evaluated. If the request has no applicable gate, record `not_applicable` with the reason; never report an unrun gate as passed.

## Skill Selection

| Intent | Required skills to load | Add only when needed |
|---|---|---|
| `analyze_story` | `jira-intelligence`, `governance` | `github-intelligence` when implementation traceability is in scope; `adr-intelligence` when decisions are relevant; `api-intelligence` when API evidence is in scope |
| `analyze_branch` | `github-intelligence`, `governance` | `implementation-intelligence` when a usable story branch exists; `merge-traceability-intelligence`, `commit-reconstruction-intelligence`, and `implementation-intelligence` when the branch is confirmed missing; `coverage-intelligence` when coverage is requested; `api-intelligence` or `playwright-intelligence` for the affected interface; `adr-intelligence` when decisions are relevant |
| `generate_test_cases` | `jira-intelligence`, `xray-intelligence`, `coverage-intelligence`, `existing-test-intelligence`, `governance` | `test-data-intelligence` when scenarios require data analysis; `api-intelligence` or `playwright-intelligence` when contract or observed UI evidence is needed |
| `generate_xray_tests` | `jira-intelligence`, `xray-intelligence`, `coverage-intelligence`, `existing-test-intelligence`, `governance` | `test-data-intelligence` when generated cases require data-set references |
| `generate_ui_automation` | `jira-intelligence`, `github-intelligence`, `playwright-intelligence`, `xray-intelligence`, `coverage-intelligence`, `existing-test-intelligence`, `governance` | `test-data-intelligence` when automation requires data analysis |
| `generate_api_automation` | `jira-intelligence`, `github-intelligence`, `api-intelligence`, `xray-intelligence`, `coverage-intelligence`, `existing-test-intelligence`, `governance` | `test-data-intelligence` when request data requires analysis |
| `generate_performance_tests` | `jira-intelligence`, `performance-intelligence`, `xray-intelligence`, `coverage-intelligence`, `existing-test-intelligence`, `governance` | `github-intelligence` when source changes are in scope; `api-intelligence` or `playwright-intelligence` for the target interface; `test-data-intelligence` when required |
| `run_pipeline` | `governance`, `xray-intelligence`, `existing-test-intelligence`, and skills for explicitly requested stages; do not use a fixed all-skills bundle | `reporting` when reports are requested or produced; add domain skills only for requested stages and relevant context |
| `generate_report` | `reporting`, `governance` | `coverage-intelligence`, `api-intelligence`, or other domain skill only when the request includes new analysis rather than reporting existing validated results |
| `analyze_coverage` | `coverage-intelligence`, `xray-intelligence`, `existing-test-intelligence`, `governance` | `jira-intelligence` or `github-intelligence` only for missing requirement or source evidence |
| `analyze_defects` | `jira-intelligence`, `governance` | `github-intelligence` for implementation evidence; `coverage-intelligence` for coverage impact; `api-intelligence` or `playwright-intelligence` for the relevant failure surface |

For `unclassified` requests, load `governance` and no domain skill by default. Add a domain skill only when the request and available evidence clearly require it; otherwise use the existing prompt/workflow handling without a catalog owner.

When GitHub Intelligence is selected, inspect `context.repositoryContext.branchExists`. If it is `available` with value `true`, select `implementation-intelligence`. If it is `available` with value `false`, select `merge-traceability-intelligence`, then `commit-reconstruction-intelligence`, then `implementation-intelligence`; reconstruction may proceed only after Implementation Trust passes. For `not_checked`, `unknown`, or unavailable branch status, select GitHub discovery only and do not assume the branch is absent.

`selectProgressiveDisclosureRoute` returns this route without loading catalog-wide contents. `loadSelectedSkillMetadata` and `loadSelectedPromptContracts` read only the route's selected skill files and prompt contracts; missing selected content falls back to the existing prompt library and is reported in the loader result.

Examples:

- `generate_ui_automation`: Jira/GitHub -> Implementation -> configured UI/API repositories -> framework/standards/pipeline -> tests/automation -> coverage/regression/delta -> reuse governance -> missing-only generation -> suite/governance/Actions recommendation. Load only the selected stage prompts for this outcome.
- `generate_api_automation`: Jira/GitHub -> Implementation -> configured UI/API repositories -> framework/standards/pipeline -> tests/automation -> coverage/regression/delta -> reuse governance -> missing-only generation -> suite/governance/Actions recommendation. Load only the selected stage prompts for this outcome.
- `generate_xray_tests`: Jira -> configured repositories and existing Xray/test inventory -> coverage/delta -> reuse governance -> missing-only Xray generation. Load the selected Existing Test, Xray, coverage, and governance contracts.
- GitHub source with confirmed missing branch: GitHub -> Merge Traceability -> Implementation Trust -> Commit Reconstruction -> Implementation Analysis. Load only the corresponding GitHub, merge-traceability, commit-reconstruction, implementation, and governance skills.

The generation chain is Implementation Intelligence -> Automation Repository Discovery -> Framework Intelligence -> Repository Standards Intelligence -> Pipeline Intelligence -> Existing Test and Automation Discovery -> Coverage Discovery -> Regression Impact -> Coverage Delta -> Reuse First -> Missing Test/Automation Generation -> Smart Regression Recommendation -> Governance -> Execution Recommendation -> GitHub Actions Compatibility. Apply the ordering, prerequisites, and gates in the workflow contract; the route itself only selects metadata and does not execute stages.

The lists are minimum selections, not permission to execute. Governance metadata is always selected; execute the applicable existing configured checks before governed analysis, generation, persistence, import, execution, or publication. Stop the affected stage on a blocking or failed mandatory gate. For a request with no applicable execution gate, record that governance was reviewed and no gate applied. Context may add a needed skill or allow an unneeded conditional skill to be omitted. Never load a skill solely because it exists in the catalog.

## Read-Only Knowledge

Consult [memory.md](memory.md) on every route to determine applicable knowledge categories, but retrieve records only when relevant. Before proposing new tests or Xray cases, perform duplicate and existing-test checks. Before generating automation, look for active, traceable automation to reuse. Before analyzing or reusing coverage, inspect prior coverage and compare its revision and execution provenance. Historical coverage is a baseline, not current passing evidence. If no populated memory source is available, use the existing Xray, test-reuse, automation, and coverage sources defined by current prompts; report unavailable evidence rather than fabricating it. Memory remains read-only and is never updated by routing.

## Backward Compatibility

- Every request still passes through intent, context, ownership, memory applicability, and skill-selection checks. If it does not map confidently to a supported intent, preserve existing behavior and use the applicable prompt or workflow directly. Ask for clarification when ambiguity affects consequential action.
- If a catalog, route, or selected skill document is missing or invalid, fall back to the existing prompt library and workflow contracts. Do not fail an otherwise supported request or load every skill as a fallback.
- Preserve existing capabilities, generation flags, integrations, artifact paths, and prompt contracts. Add Existing Test Intelligence after implementation analysis and before generation; require explicit reuse/coverage analysis and reuse governance before generating or publishing new assets.
- The selected owner is a routing label only. Existing authorization, permission, human-approval, and execution rules remain in force.