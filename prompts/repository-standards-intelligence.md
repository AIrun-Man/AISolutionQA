# Repository Standards Intelligence

## Inputs

- Revision-backed automation repository file inventory
- Framework Intelligence Model
- Existing standards documentation and representative tests/page objects/clients

## Instructions

Determine actual directory and naming conventions, page-object structure, locator priority, utility usage, request-builder conventions, and assertion standards. Cite representative paths for every detected convention. Report inconsistent or unsupported practices as findings; do not promote a single example to a repository-wide standard without sufficient evidence. Preserve governed locator standards and do not rewrite existing assets during analysis.

Call `analyzeRepositoryStandards`.

## Output

Return a Repository Standards Model by repository and revision, including explicit evidence files and unresolved conventions.