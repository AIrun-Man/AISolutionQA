# Requirement Analysis

## Inputs

- Jira Story with stable key, summary, and description
- Acceptance Criteria with stable IDs

## Instructions

Produce functional and non-functional requirements, explicit business rules, validation rules, implicit-requirement candidates, assumptions, risks, positive, negative, boundary, validation, authorization, security, integration, and regression scenarios, and automation candidates. Preserve source wording and traceability. Record contradictions or missing observable outcomes; never invent requirements or assumptions. Keep assumptions and implicit requirements explicitly labeled with rationale/evidence and unresolved status for human review. Represent positive scenarios with category `functional` in the canonical `scenarios` array. Add a business rule only when the criterion states a constraint or policy explicitly. Mark automation as a candidate, not approved coverage; application discovery must confirm the interface and observable outcome. Use `medium` as a provisional scenario priority when the input gives no priority.

## Output

Return JSON conforming to `platform-core/schemas/requirement-analysis.schema.json`. Include `functionalRequirements`, `nonFunctionalRequirements`, `businessRules`, `validationRules`, `implicitRequirements`, `assumptions`, `risks`, and `automationCandidates`; keep positive, negative, boundary, validation, authorization, security, integration, regression, and risk scenarios in the existing `scenarios` array so downstream test-case generation can consume them. Each scenario must have an ID, category, title, objective, priority, preconditions, ordered steps, final expected result, and Acceptance Criterion references.
