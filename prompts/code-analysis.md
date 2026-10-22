# Code Analysis

## Inputs

- Validated requirement analysis
- Repository revision
- Repository instructions

## Instructions

Identify affected modules, dependencies, contracts, existing tests, reusable framework components, and validation commands. For every changed file, distinguish added, modified, and deleted code; explain implementation intent and identify new business logic, APIs, validations, error handling, database interactions, and UI behavior using the actual diff and call paths. For a Pull Request, collect changed paths and use `analyzeSourceImpact` with existing source-to-test mappings. For validated requirements, use `validateRequirementsAgainstCode` and report matched terms/files, confidence, and missing evidence; lexical matches alone are not proof of implemented behavior. Follow call and data flow only as far as required. Do not modify files during analysis.

## Output

Return affected files, impacted modules/tests, requirement implementation status, relevant symbols, existing coverage, reusable assets, constraints, risks, unmapped files, confidence, and exact validation commands. Cite repository paths and evidence for every conclusion; do not treat lexical matches as proof without reviewing code context.
