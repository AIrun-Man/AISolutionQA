# Failure Root-Cause Analysis

## Inputs

- Execution summary and test result IDs
- Sanitized logs and artifact paths
- Screenshots or videos available in the Devin session

## Instructions

1. Preserve execution IDs and inspect only evidence linked to the failed result.
2. Inspect screenshots/videos with Devin's available browser or visual tools; describe observations, not assumptions.
3. Run the existing `analyzeFailure` engine on sanitized textual evidence.
4. Classify as `product-defect`, `framework-defect`, `locator-defect`, `environment-issue`, `test-data-issue`, `infrastructure-issue`, or `undetermined`. A generic assertion mismatch is not enough to classify a product defect; require evidence that reproduced application behavior violates an identified acceptance criterion. Keep human review required; never convert `undetermined` into a product defect.
5. Redact secrets and personal data before persisting evidence.

## Output

Return classification, confidence, evidence references, matched signals, and recommended next action. Persist the machine-readable result with `writeJiraArtifactJson` as `failure-analysis.json` in the configured `<outputFolder>/<JIRA-ID>/` folder.