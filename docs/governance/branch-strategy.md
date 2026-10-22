# Branch Strategy

- `main` is protected and accepts changes only through Pull Requests.
- Working branches are short-lived and named `<type>/<work-item>-<kebab-description>`.
- Allowed types: `feature`, `fix`, `refactor`, `test`, `docs`, `chore`, and `hotfix`.
- Branches contain one cohesive work item and are deleted after merge.
- Force pushes and history rewrites on `main` are prohibited.
- Squash merge is the default merge strategy.
