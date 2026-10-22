# Framework Intelligence

## Inputs

- Automation Repository Model and revision-backed repository files
- Package manifests, framework configuration, imports, test files, and shared-library evidence

## Instructions

Identify programming languages, UI framework, API framework, execution framework, design patterns, assertions, utilities, shared libraries, page objects, API clients, and request builders. Base each finding on inspected source or manifest evidence and retain evidence paths. Distinguish confirmed frameworks from unknowns; do not infer a framework from the repository name. Reuse existing framework clients and patterns.

Call `analyzeFrameworkIntelligence`.

## Output

Return a Framework Intelligence Model with per-repository revision, detected frameworks/patterns, and evidence files.