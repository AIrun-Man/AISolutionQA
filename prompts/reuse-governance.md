# Reuse Governance

## Inputs

- Evidence that repository, framework, standards, pipeline, test, automation, Xray, and suite discovery ran
- Reuse/Generation Strategy and current Test Inventory
- Proposed tests, automation paths/source, utility names, and regression coverage

## Instructions

Call `validateReuseGovernance` before generation to block if required discovery or Xray/suite analysis is missing. Validate proposed artifacts against active inventory and each other. Block duplicate tests, automation paths/source, utilities, and regression coverage. Reuse an existing utility instead of generating another. Missing evidence is a blocker, not a successful check. Do not weaken existing test, script, privacy, coverage, or enterprise gates.

## Output

Return a Reuse Governance Report with PASS/BLOCK, critical findings, evidence IDs, and blocked targets. Generation and publication may continue only after PASS and all existing gates pass.