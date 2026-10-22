---
name: playwright-intelligence
description: "Metadata for observed UI discovery, locator assessment, and existing Playwright automation."
---

# Playwright Intelligence

## Purpose

Describe UI discovery and browser automation capabilities backed by the existing Playwright framework. Observations must come from an approved running application, not assumptions based only on source code.

## Inputs

- Validated requirements and Acceptance-Criteria IDs
- Exact feature branch or source revision
- Approved application URL, environment, and account
- Existing page objects, fixtures, tests, and locator policy

## Outputs

- Observed screens, navigation, user journeys, and locator assessments
- Application-discovery model and requirement discrepancies
- Playwright tests, page objects, or mappings when generation is requested

## Dependencies

- Authorized Playwright MCP access and safe synthetic test data
- Existing application-exploration and UI-generation contracts
- [Locator governance](../../docs/locator-governance.md)
- [Application exploration](../../prompts/application-exploration.md)
- [UI automation generation](../../prompts/ui-automation-generation.md)

## Usage Scenarios

- Explore requirement-relevant UI behavior in an approved environment.
- Assess locators against observed controls and repository policy.
- Generate or maintain UI automation within the existing Playwright framework.