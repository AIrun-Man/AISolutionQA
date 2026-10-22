# Pull Request Creation

## Inputs

- Validated change set
- Requirement and Acceptance Criterion IDs
- Test Case and Automation IDs
- Execution and coverage reports

## Instructions

Resolve the automation repository from approved project configuration or Jira/GitHub links; do not guess the target repository. Verify scope, secret safety, documentation, commits, and available validation evidence. Complete `.github/pull_request_template.md` and create a draft PR when required Actions checks must run after PR creation. Do not claim checks that did not run, expose generated reports or secrets, merge the PR, or mark it ready for review while required checks are incomplete or failed. Preserve required human review and approval gates.

## Output

Return a governance-compliant title, completed Pull Request body, reviewer roles, exact evidence references, and any unresolved blocker.
