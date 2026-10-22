import { basename } from "node:path";

import type { ApiContractOperation } from "../api/contracts.js";
import type { ApiGovernancePolicy, ApiIntelligenceReport } from "../api/intelligence.js";
import type { CoverageGovernancePolicy, CoverageIntelligenceReport } from "../coverage/intelligence.js";
import type { ApplicationDiscovery, ApplicationDiscoveryIntelligence } from "../models/discovery.js";
import { validateDiscovery } from "../models/discovery.js";
import type { AcceptanceCriterion, BusinessRule, RequirementAnalysis } from "../models/requirements.js";
import type { StandardTestCase } from "../models/test-cases.js";
import type { StoryReadinessReport } from "../evidence/intelligence.js";
import { assessLocator, type LocatorCandidate } from "./locator.js";
import type { GovernanceConfig, GovernanceSeverity } from "./configuration.js";
import { writeJsonArtifact } from "../reporting/generator.js";
import type { ImplementationSourceModel, ImplementationTrustCheck, ImplementationTrustFinding, ImplementationTrustReport } from "../implementation/lineage.js";

export type GovernanceStatus = "PASS" | "WARNING" | "BLOCK";

export interface GovernanceFinding {
  id: string;
  category: string;
  severity: GovernanceSeverity;
  entityId: string;
  description: string;
  evidenceReferences: string[];
  remediation?: string;
}

export interface GovernanceReport {
  schemaVersion: "1.0.0";
  governanceType: string;
  storyKey: string;
  status: GovernanceStatus;
  qualityScore: number;
  findings: GovernanceFinding[];
  confidenceScore?: number;
}

function report(governanceType: string, storyKey: string, checks: boolean[], findings: GovernanceFinding[]): GovernanceReport {
  return {
    schemaVersion: "1.0.0",
    governanceType,
    storyKey,
    status: findings.some((finding) => finding.severity === "critical") ? "BLOCK"
      : findings.some((finding) => finding.severity === "warning") ? "WARNING" : "PASS",
    qualityScore: checks.length === 0 ? 100 : Math.round(checks.filter(Boolean).length / checks.length * 100),
    findings
  };
}

function finding(
  id: string,
  category: string,
  severity: GovernanceSeverity,
  entityId: string,
  description: string,
  evidenceReferences: string[] = [],
  remediation?: string
): GovernanceFinding {
  return { id, category, severity, entityId, description, evidenceReferences, ...(remediation ? { remediation } : {}) };
}

export interface DuplicateStoryCandidate {
  storyKey: string;
  confidence: number;
  summary: string;
}

export interface RequirementGovernanceInput {
  storyKey: string;
  summary: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  confidence: number;
  businessContext: Record<string, string | undefined>;
  dependencies: Array<{ id: string; available: boolean }>;
  duplicateStories: DuplicateStoryCandidate[];
  conflictingRequirementIds: string[][];
}

export interface RequirementGovernanceReport extends GovernanceReport {
  confidenceScore: number;
}

export function coveragePolicyFromGovernance(config: GovernanceConfig): CoverageGovernancePolicy {
  return {
    minRequirementCoveragePercent: config.qualityGates.minimumCoveragePercent,
    minAcceptanceCriteriaCoveragePercent: config.qualityGates.minimumAcceptanceCriteriaCoveragePercent,
    minCriticalRequirementCoveragePercent: config.qualityGates.minimumCriticalRequirementCoveragePercent,
    minHighRiskCodeCoveragePercent: config.qualityGates.minimumHighRiskCodeCoveragePercent
  };
}

export function apiPolicyFromGovernance(config: GovernanceConfig): ApiGovernancePolicy {
  return {
    minCriticalApiCoveragePercent: config.qualityGates.minimumCriticalApiCoveragePercent,
    minAuthenticationCoveragePercent: config.qualityGates.minimumAuthenticationCoveragePercent,
    minHighRiskEndpointCoveragePercent: config.qualityGates.minimumHighRiskApiCoveragePercent,
    minContractCoveragePercent: config.qualityGates.minimumContractCoveragePercent
  };
}

export function validateRequirementsBeforeAnalysis(config: GovernanceConfig, input: RequirementGovernanceInput): RequirementGovernanceReport {
  const findings: GovernanceFinding[] = [];
  if (!input.storyKey.trim() || !input.summary.trim() || !input.description.trim()) {
    findings.push(finding("REQ-STORY-CONTEXT", "business-context", "critical", input.storyKey || "unknown", "Raw story key, summary, and description are required."));
  }
  const criteria = input.acceptanceCriteria;
  const criterionIds = new Set<string>();
  for (const criterion of criteria) {
    if (!criterion.id.trim() || !criterion.description.trim()) findings.push(finding(`REQ-AC-INCOMPLETE-${criterion.id || "unknown"}`, "acceptance-criteria", "critical", criterion.id || input.storyKey, "Acceptance Criteria need a stable ID and non-empty description."));
    if (criterionIds.has(criterion.id)) findings.push(finding(`REQ-AC-DUPLICATE-${criterion.id}`, "duplicate-acceptance-criteria", "critical", criterion.id, "Acceptance Criterion ID is duplicated."));
    criterionIds.add(criterion.id);
  }
  if (criteria.length < config.requirementGuardrails.minimumAcceptanceCriteria) {
    findings.push(finding("REQ-MISSING-AC", "acceptance-criteria", "critical", input.storyKey,
      `Found ${criteria.length} Acceptance Criteria; configured minimum is ${config.requirementGuardrails.minimumAcceptanceCriteria}.`));
  }
  let ambiguousCount = 0;
  for (const criterion of criteria) {
    const matches = config.requirementGuardrails.ambiguityPatterns.filter((pattern) => new RegExp(pattern, "i").test(criterion.description));
    if (matches.length > 0) {
      ambiguousCount += 1;
      findings.push(finding(`REQ-AMBIG-${criterion.id}`, "ambiguity", "warning", criterion.id,
        "Acceptance Criterion contains a configured ambiguity pattern.", matches));
    }
  }
  if (ambiguousCount > config.requirementGuardrails.maximumAmbiguousAcceptanceCriteria) {
    findings.push(finding("REQ-AMBIG-LIMIT", "ambiguity", "critical", input.storyKey,
      `Ambiguous criteria count ${ambiguousCount} exceeds configured maximum ${config.requirementGuardrails.maximumAmbiguousAcceptanceCriteria}.`));
  }
  if (input.businessRules.length < config.requirementGuardrails.minimumBusinessRules) {
    findings.push(finding("REQ-BUSINESS-RULES", "business-rules", "critical", input.storyKey,
      `Found ${input.businessRules.length} business rules; configured minimum is ${config.requirementGuardrails.minimumBusinessRules}.`));
  }
  for (const rule of input.businessRules) {
    if (!rule.description.trim() || rule.acceptanceCriteriaIds.length === 0 || rule.acceptanceCriteriaIds.some((id) => !criterionIds.has(id))) {
      findings.push(finding(`REQ-BUSINESS-RULE-INCOMPLETE-${rule.id}`, "business-rules", "critical", rule.id, "Business rule is incomplete or references unknown Acceptance Criteria."));
    }
  }
  for (const contextField of config.requirementGuardrails.requiredBusinessContextFields) {
    if (!input.businessContext[contextField]?.trim()) {
      findings.push(finding(`REQ-CONTEXT-${contextField}`, "business-context", "critical", input.storyKey,
        `Required business context is missing: ${contextField}.`));
    }
  }
  if (input.dependencies.some((dependency) => !dependency.available) && config.requirementGuardrails.blockMissingDependencies) {
    for (const dependency of input.dependencies.filter((item) => !item.available)) {
      findings.push(finding(`REQ-DEPENDENCY-${dependency.id}`, "dependency", "critical", dependency.id,
        "A required requirement dependency is unavailable."));
    }
  }
  for (const conflict of input.conflictingRequirementIds) {
    findings.push(finding(`REQ-CONFLICT-${conflict.join("-")}`, "conflict", "critical", conflict.join(", "),
      "Conflicting requirements require product-owner resolution.", conflict));
  }
  if (input.confidence < config.requirementGuardrails.minimumConfidence) {
    findings.push(finding("REQ-CONFIDENCE", "confidence", "critical", input.storyKey,
      `Requirement confidence ${input.confidence} is below configured minimum ${config.requirementGuardrails.minimumConfidence}.`));
  }
  for (const duplicate of input.duplicateStories) {
    if (duplicate.storyKey !== input.storyKey && duplicate.confidence > config.requirementGuardrails.duplicateStoryConfidenceThreshold) {
      findings.push(finding(`REQ-DUPLICATE-${duplicate.storyKey}`, "duplicate-story", "critical", duplicate.storyKey,
        `Potential duplicate story confidence ${duplicate.confidence} exceeds configured threshold ${config.requirementGuardrails.duplicateStoryConfidenceThreshold}.`, [input.storyKey, duplicate.storyKey]));
    }
  }
  const completeContextCount = config.requirementGuardrails.requiredBusinessContextFields.filter((field) => Boolean(input.businessContext[field]?.trim())).length;
  const scoreDimensions = [
    criteria.length >= config.requirementGuardrails.minimumAcceptanceCriteria,
    ambiguousCount <= config.requirementGuardrails.maximumAmbiguousAcceptanceCriteria,
    completeContextCount === config.requirementGuardrails.requiredBusinessContextFields.length,
    input.confidence >= config.requirementGuardrails.minimumConfidence,
    !findings.some((item) => item.category === "requirement-quality")
  ];
  const score = Math.round(scoreDimensions.filter(Boolean).length / scoreDimensions.length * 100);
  const result = report("requirement-governance", input.storyKey, [!findings.some((item) => item.category === "requirement-quality"), criteria.length >= config.requirementGuardrails.minimumAcceptanceCriteria,
    ambiguousCount <= config.requirementGuardrails.maximumAmbiguousAcceptanceCriteria, completeContextCount === config.requirementGuardrails.requiredBusinessContextFields.length,
    input.confidence >= config.requirementGuardrails.minimumConfidence], findings);
  return { ...result, qualityScore: score, confidenceScore: input.confidence };
}

export interface TestGovernanceInput {
  analysis: RequirementAnalysis;
  testCases: StandardTestCase[];
  assertionReferences?: Record<string, string[]>;
  discovery?: ApplicationDiscovery | ApplicationDiscoveryIntelligence;
  coverage?: CoverageIntelligenceReport;
  coveredRiskAcceptanceCriteriaIds?: string[];
}

function normalized(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

export function validateGeneratedTests(config: GovernanceConfig, input: TestGovernanceInput): GovernanceReport {
  const findings: GovernanceFinding[] = [];
  const coveredCriteria = new Set(input.testCases.flatMap((testCase) => testCase.traceability.acceptanceCriteriaIds));
  const coveredScenarios = new Set(input.testCases.flatMap((testCase) => testCase.traceability.scenarioIds));
  const signatures = new Map<string, string[]>();
  for (const testCase of input.testCases) {
    const signature = `${normalized(testCase.title)}::${[...testCase.traceability.acceptanceCriteriaIds].sort().join("|")}`;
    signatures.set(signature, [...(signatures.get(signature) ?? []), testCase.id]);
    for (const scenarioId of testCase.traceability.scenarioIds) {
      const scenario = input.analysis.scenarios.find((item) => item.id === scenarioId);
      if (!scenario) {
        findings.push(finding(`TEST-UNKNOWN-SCENARIO-${testCase.id}`, "invalid-scenario", "critical", testCase.id,
          `Test case references unknown scenario ${scenarioId}.`));
        continue;
      }
    }
    if (testCase.expectedResult.trim().length < config.testGenerationGuardrails.minimumExpectedResultLength) {
      findings.push(finding(`TEST-WEAK-EXPECTED-${testCase.id}`, "weak-expected-result", "critical", testCase.id,
        `Expected result is shorter than configured minimum ${config.testGenerationGuardrails.minimumExpectedResultLength}.`));
    }
    const assertions = input.assertionReferences?.[testCase.id] ?? [];
    if (assertions.length < config.testGenerationGuardrails.minimumAssertionReferences) {
      findings.push(finding(`TEST-ASSERTIONS-${testCase.id}`, "missing-assertion", "critical", testCase.id,
        `Assertion references ${assertions.length} are below configured minimum ${config.testGenerationGuardrails.minimumAssertionReferences}.`));
    }
  }
  if (config.testGenerationGuardrails.detectDuplicateTests) {
    for (const [signature, ids] of signatures) if (ids.length > 1) findings.push(finding(`TEST-DUPLICATE-${ids.join("-")}`, "duplicate-test", "critical", ids.join(", "),
      "Duplicate test cases have the same normalized title and Acceptance-Criteria set.", [signature]));
  }
  if (config.testGenerationGuardrails.detectDuplicateScenarios) {
    const duplicateScenarioTitles = new Map<string, string[]>();
    for (const scenario of input.analysis.scenarios) {
      const titleSignature = `${normalized(scenario.title)}::${[...scenario.acceptanceCriteriaIds].sort().join("|")}`;
      duplicateScenarioTitles.set(titleSignature, [...(duplicateScenarioTitles.get(titleSignature) ?? []), scenario.id]);
    }
    for (const [signature, ids] of duplicateScenarioTitles) if (ids.length > 1) findings.push(finding(`SCENARIO-DUPLICATE-${ids.join("-")}`, "duplicate-scenario", "critical", ids.join(", "),
      "Duplicate scenarios have the same normalized title and Acceptance-Criteria set.", [signature]));
  }
  const missingCriteria = input.analysis.acceptanceCriteria.filter((criterion) => !coveredCriteria.has(criterion.id));
  for (const criterion of missingCriteria) findings.push(finding(`TEST-COVERAGE-${criterion.id}`, "missing-coverage", "critical", criterion.id,
    "Acceptance Criterion has no generated test case."));
  const missingScenarios = input.analysis.scenarios.filter((scenario) => !coveredScenarios.has(scenario.id));
  for (const scenario of missingScenarios) findings.push(finding(`TEST-SCENARIO-${scenario.id}`, "missing-scenario-coverage", "critical", scenario.id,
    "Requirement scenario has no generated test case."));
  const coveragePercent = input.analysis.acceptanceCriteria.length === 0 ? 0 : coveredCriteria.size / input.analysis.acceptanceCriteria.length * 100;
  if (coveragePercent < config.testGenerationGuardrails.minimumCoveragePercent) findings.push(finding("TEST-COVERAGE-THRESHOLD", "coverage", "critical", input.analysis.story.key,
    `Acceptance-Criteria coverage ${coveragePercent} is below configured minimum ${config.testGenerationGuardrails.minimumCoveragePercent}.`));
  const riskCriteria = [...new Set((input.analysis.risks ?? []).flatMap((risk) => risk.acceptanceCriteriaIds))];
  const coveredRisk = new Set(input.coveredRiskAcceptanceCriteriaIds ?? input.testCases
    .filter((testCase) => testCase.scenarioType === "risk")
    .flatMap((testCase) => testCase.traceability.acceptanceCriteriaIds));
  for (const criterionId of riskCriteria) {
    if (!coveredRisk.has(criterionId)) {
      findings.push(finding(`TEST-RISK-${criterionId}`, "risk-coverage", "critical", criterionId, "Critical risk lacks an explicit test case."));
    }
  }
  const riskCoveragePercent = riskCriteria.length === 0 ? 100 : riskCriteria.filter((id) => coveredRisk.has(id)).length / riskCriteria.length * 100;
  if (riskCoveragePercent < config.testGenerationGuardrails.minimumRiskCoveragePercent) findings.push(finding("TEST-RISK-COVERAGE-THRESHOLD", "risk-coverage", "critical", input.analysis.story.key,
    `Risk coverage ${riskCoveragePercent} is below configured minimum ${config.testGenerationGuardrails.minimumRiskCoveragePercent}.`));
  const uiTestCases = input.testCases.filter((testCase) => testCase.repositorySections?.includes("UI"));
  if (config.testGenerationGuardrails.requireValidUserJourneys && uiTestCases.length > 0 && !input.discovery) {
    findings.push(finding("TEST-JOURNEY-MISSING", "invalid-user-journey", "critical", input.analysis.story.key,
      "Application Discovery is required before governing UI test journeys."));
  }
  if (config.testGenerationGuardrails.requireValidUserJourneys && input.discovery) {
    const discoveryModel = "uiDiscoveryModel" in input.discovery ? input.discovery.uiDiscoveryModel : input.discovery;
    for (const error of validateDiscovery(discoveryModel)) findings.push(finding(`TEST-JOURNEY-${findings.length + 1}`, "invalid-user-journey", "critical", input.analysis.story.key, error));
    const journeyCriteria = new Set((discoveryModel.userJourneys ?? []).flatMap((journey) => journey.requirementIds.flatMap((id) => {
      const requirement = [
        ...(input.analysis.functionalRequirements ?? []),
        ...(input.analysis.nonFunctionalRequirements ?? []),
        ...(input.analysis.businessRules ?? []),
        ...(input.analysis.validationRules ?? []),
        ...(input.analysis.implicitRequirements ?? [])
      ].find((item) => item.id === id);
      return requirement?.acceptanceCriteriaIds ?? [];
    })));
    for (const testCase of uiTestCases) {
      for (const criterionId of testCase.traceability.acceptanceCriteriaIds) {
        if (!journeyCriteria.has(criterionId)) findings.push(finding(`TEST-JOURNEY-AC-${testCase.id}-${criterionId}`, "invalid-user-journey", "critical", testCase.id,
          `UI test case is not represented by an observed user journey for ${criterionId}.`));
      }
    }
  }
  const existingCoverage = input.coverage?.metrics.requirementCoveragePercent;
  if (config.testGenerationGuardrails.blockRedundantCoverage && existingCoverage !== undefined && existingCoverage >= config.testGenerationGuardrails.minimumCoveragePercent) {
    findings.push(finding("TEST-REDUNDANT-COVERAGE", "redundant-coverage", config.testGenerationGuardrails.blockRedundantCoverage ? "critical" : "warning", input.analysis.story.key,
      "Existing requirement coverage already meets the configured minimum; review reuse analysis before creating additional cases."));
  }
  return report("test-generation-governance", input.analysis.story.key,
    [missingCriteria.length === 0, missingScenarios.length === 0, coveragePercent >= config.testGenerationGuardrails.minimumCoveragePercent], findings);
}

export interface AutomationScriptAsset {
  id: string;
  path: string;
  source: string;
  strategy: "ui" | "api" | "contract" | "component" | "performance";
  frameworkCompliant: boolean;
  usesPageObject: boolean;
  reusesUtility: boolean;
  assertionCount: number;
  testCaseId?: string;
  locatorValues: string[];
}

export function validateAutomationScripts(config: GovernanceConfig, storyKey: string, scripts: AutomationScriptAsset[]): GovernanceReport {
  const findings: GovernanceFinding[] = [];
  const sourceOwners = new Map<string, string[]>();
  const locatorOwners = new Map<string, string[]>();
  for (const script of scripts) {
    const fileName = basename(script.path);
    if (!new RegExp(config.automationGuardrails.namingPattern).test(fileName)) findings.push(finding(`SCRIPT-NAME-${script.id}`, "naming", "critical", script.id,
      `Script file name ${fileName} does not match the configured naming pattern.`));
    if (config.automationGuardrails.requireFrameworkCompliance && (!script.frameworkCompliant ||
      !config.automationGuardrails.frameworkComplianceMarkers.some((marker) => script.source.includes(marker)))) {
      findings.push(finding(`SCRIPT-FRAMEWORK-${script.id}`, "framework-bypass", "critical", script.id, "Script does not demonstrate compliance with configured framework markers."));
    }
    if (script.strategy === "ui" && config.automationGuardrails.requirePageObjects && !script.usesPageObject) {
      findings.push(finding(`SCRIPT-PAGE-OBJECT-${script.id}`, "page-object", "critical", script.id, "UI script bypasses the configured page-object requirement."));
    }
    if (config.automationGuardrails.requireUtilityReuse && !script.reusesUtility) {
      findings.push(finding(`SCRIPT-UTILITY-${script.id}`, "utility-reuse", "warning", script.id, "Script does not reference a reusable framework utility."));
    }
    if (config.automationGuardrails.requireAssertions && script.assertionCount < config.automationGuardrails.minimumAssertionCount) {
      findings.push(finding(`SCRIPT-ASSERTION-${script.id}`, "assertion-quality", "critical", script.id,
        `Assertion count is below configured minimum ${config.automationGuardrails.minimumAssertionCount}.`));
    }
    if (config.automationGuardrails.requireTestTraceability && !script.testCaseId) {
      findings.push(finding(`SCRIPT-TRACE-${script.id}`, "traceability", "critical", script.id, "Script is not linked to a generated or reused test case."));
    }
    for (const rule of config.automationGuardrails.prohibitedPatterns) {
      if (new RegExp(rule.pattern, "i").test(script.source)) findings.push(finding(`SCRIPT-RULE-${script.id}-${rule.id}`, rule.id.includes("credential") ? "security" : "framework-compliance", rule.severity, script.id, rule.description, [script.path]));
    }
    const signature = script.source.trim();
    sourceOwners.set(signature, [...(sourceOwners.get(signature) ?? []), script.id]);
    for (const locator of script.locatorValues) locatorOwners.set(locator, [...(locatorOwners.get(locator) ?? []), script.id]);
  }
  if (config.automationGuardrails.detectDuplicateScripts) {
    for (const ids of sourceOwners.values()) if (ids.length > 1) findings.push(finding(`SCRIPT-DUPLICATE-${ids.join("-")}`, "duplicate-script", "critical", ids.join(", "), "Generated scripts have identical source content."));
  }
  if (config.automationGuardrails.detectDuplicateLocators) {
    for (const [locator, ids] of locatorOwners) if (ids.length > 1) findings.push(finding(`SCRIPT-LOCATOR-${ids.join("-")}`, "duplicate-locator", "warning", ids.join(", "), "The same locator is duplicated across scripts.", [locator]));
  }
  return report("script-governance", storyKey, [findings.every((item) => item.severity !== "critical")], findings);
}

export interface PerformanceTestPlan {
  id: string;
  environment: string;
  users: number;
  durationSeconds: number;
  rampRate: number;
  requestRate: number;
  testSize: number;
  parallelExecutions: number;
}

export function validatePerformancePlan(config: GovernanceConfig, plans: PerformanceTestPlan[]): GovernanceReport {
  const findings: GovernanceFinding[] = [];
  const policy = config.performanceGuardrails;
  if (!policy.enabled && plans.length > 0) findings.push(finding("PERF-DISABLED", "performance-disabled", "critical", "performance", "Performance testing is disabled by governance configuration."));
  for (const plan of plans) {
    if (policy.blockProduction && plan.environment.trim().toLowerCase() === "prod") findings.push(finding(`PERF-PRODUCTION-${plan.id}`, "production-environment", "critical", plan.id, "Performance execution is blocked in production by governance configuration."));
    if (!policy.allowedEnvironments.some((environment) => environment.toLowerCase() === plan.environment.toLowerCase())) findings.push(finding(`PERF-ENV-${plan.id}`, "environment-suitability", "critical", plan.id, `Environment ${plan.environment} is not in the configured performance allow-list.`));
    if (plan.users > policy.maximumUsers) findings.push(finding(`PERF-USERS-${plan.id}`, "traffic-limit", "critical", plan.id, `User count ${plan.users} exceeds configured maximum ${policy.maximumUsers}.`));
    if (plan.durationSeconds > policy.maximumDurationSeconds) findings.push(finding(`PERF-DURATION-${plan.id}`, "traffic-limit", "critical", plan.id, `Duration ${plan.durationSeconds} exceeds configured maximum ${policy.maximumDurationSeconds}.`));
    if (plan.rampRate > policy.maximumRampRate) findings.push(finding(`PERF-RAMP-${plan.id}`, "traffic-limit", "critical", plan.id, `Ramp rate ${plan.rampRate} exceeds configured maximum ${policy.maximumRampRate}.`));
    if (plan.requestRate > policy.maximumRequestRate) findings.push(finding(`PERF-RPS-${plan.id}`, "traffic-limit", "critical", plan.id, `Request rate ${plan.requestRate} exceeds configured maximum ${policy.maximumRequestRate}.`));
    if (plan.testSize > policy.maximumTestSize) findings.push(finding(`PERF-SIZE-${plan.id}`, "test-size", "critical", plan.id, `Test size ${plan.testSize} exceeds configured maximum ${policy.maximumTestSize}.`));
    if (plan.parallelExecutions > policy.maximumParallelExecutions) findings.push(finding(`PERF-PARALLEL-${plan.id}`, "parallel-execution", "critical", plan.id, `Parallel executions ${plan.parallelExecutions} exceed configured maximum ${policy.maximumParallelExecutions}.`));
  }
  return report("performance-governance", "performance", [findings.length === 0], findings);
}

export type GeneratedReferenceType = "api" | "endpoint" | "ui-path" | "locator" | "validation" | "business-rule" | "request-schema";

export interface GeneratedReference {
  artifactId: string;
  type: GeneratedReferenceType;
  reference: string;
  evidenceReferences: string[];
  targetElementId?: string;
  locatorCandidate?: LocatorCandidate;
}

export interface HallucinationInput {
  storyKey: string;
  references: GeneratedReference[];
  requirementAnalysis: RequirementAnalysis;
  apiOperations: ApiContractOperation[];
  applicationDiscovery?: ApplicationDiscovery | ApplicationDiscoveryIntelligence;
}

export interface HallucinationDetectionReport extends GovernanceReport {
  confidenceScore: number;
}

export function detectHallucinations(config: GovernanceConfig, input: HallucinationInput): HallucinationDetectionReport {
  const findings: GovernanceFinding[] = [];
  const discovery = input.applicationDiscovery
    ? ("uiDiscoveryModel" in input.applicationDiscovery ? input.applicationDiscovery.uiDiscoveryModel : input.applicationDiscovery)
    : undefined;
  const pages = discovery?.pages ?? [];
  const elementIds = new Set(pages.flatMap((page) => [
    ...page.menus.map((item) => item.id),
    ...page.forms.flatMap((form) => [form.id, ...form.fields.map((field) => field.id)]),
    ...page.tables.flatMap((table) => [table.id, ...table.columns.map((column) => column.id)]),
    ...page.buttons.map((item) => item.id),
    ...(page.dialogs ?? []).map((item) => item.id)
  ]));
  const routes = new Set(pages.map((page) => page.route));
  const validations = new Set(pages.flatMap((page) => page.validations.map((item) => item.id)));
  const businessRules = new Set((input.requirementAnalysis.businessRules ?? []).flatMap((rule) => [rule.id, normalized(rule.description)]));
  const operations = new Set(input.apiOperations.flatMap((operation) => [
    operation.operationId,
    `${operation.method} ${operation.path}`
  ]));
  for (const reference of input.references) {
    let exists: boolean | undefined;
    switch (reference.type) {
      case "api":
      case "endpoint":
        exists = operations.has(reference.reference);
        break;
      case "ui-path":
        exists = routes.has(reference.reference);
        break;
      case "locator":
        exists = reference.targetElementId
          ? elementIds.has(reference.targetElementId) && reference.evidenceReferences.includes(reference.targetElementId)
          : elementIds.has(reference.reference);
        if (exists && reference.locatorCandidate && !assessLocator(reference.locatorCandidate).approved) {
          findings.push(finding(`HALLUCINATION-LOCATOR-${reference.artifactId}`, "invalid-locator", "critical", reference.artifactId,
            "Generated locator does not satisfy configured locator governance rules.", [reference.locatorCandidate.value, ...reference.evidenceReferences]));
        }
        break;
      case "validation":
        exists = validations.has(reference.reference);
        break;
      case "business-rule":
        exists = businessRules.has(reference.reference) || businessRules.has(normalized(reference.reference));
        break;
      case "request-schema":
        exists = input.apiOperations.some((operation) => operation.requestSchema?.name === reference.reference);
        break;
    }
    const shouldBlockUnknown = reference.type === "business-rule"
      ? config.hallucinationGuardrails.blockUnsupportedBusinessRules
      : config.hallucinationGuardrails.blockUnknownReferences;
    if (exists === false && shouldBlockUnknown) findings.push(finding(
      `HALLUCINATION-${reference.artifactId}-${reference.type}`,
      "hallucination",
      "critical",
      reference.artifactId,
      `Generated ${reference.type} reference does not exist in the approved evidence catalogs.`,
      reference.evidenceReferences
    ));
    if (reference.evidenceReferences.length < config.hallucinationGuardrails.minimumEvidenceReferences) findings.push(finding(
      `HALLUCINATION-EVIDENCE-${reference.artifactId}`,
      "missing-evidence",
      shouldBlockUnknown ? "critical" : "warning",
      reference.artifactId,
      `Generated reference has fewer than configured evidence references (${config.hallucinationGuardrails.minimumEvidenceReferences}).`
    ));
  }
  const result = report("hallucination-guardrails", input.storyKey, [findings.length === 0], findings);
  return { ...result, confidenceScore: input.references.length === 0 ? 0 : Math.round((input.references.length - findings.filter((item) => item.category === "hallucination").length) / input.references.length * 100) };
}

export interface PrivacyArtifactInput {
  artifactId: string;
  artifactType: "requirement" | "test-case" | "automation-script" | "report" | "artifact";
  content: string;
  productionData?: boolean;
}

export interface SanitizedPrivacyArtifact {
  artifactId: string;
  status: "sanitized" | "blocked";
  content: string;
}

export interface DataPrivacyReport extends GovernanceReport {
  sanitizedArtifacts: SanitizedPrivacyArtifact[];
}

export function validateDataPrivacy(config: GovernanceConfig, storyKey: string, artifacts: PrivacyArtifactInput[]): DataPrivacyReport {
  const findings: GovernanceFinding[] = [];
  const sanitizedArtifacts = artifacts.map((artifact): SanitizedPrivacyArtifact => {
    let content = artifact.content;
    let blocked = artifact.productionData === true && config.privacyGuardrails.blockProductionData;
    if (artifact.productionData && !config.privacyGuardrails.blockProductionData) {
      if (config.privacyGuardrails.defaultAction === "block") blocked = true;
      else if (config.privacyGuardrails.defaultAction === "mask" || config.privacyGuardrails.defaultAction === "replace") {
        content = config.privacyGuardrails.replacementText;
      } else if (config.privacyGuardrails.defaultAction === "synthetic-data") {
        content = config.privacyGuardrails.allowSyntheticData ? "[SYNTHETIC_DATA]" : "[BLOCKED BY PRIVACY GOVERNANCE]";
        blocked = !config.privacyGuardrails.allowSyntheticData;
      }
    }
    if (blocked) findings.push(finding(`PRIVACY-PRODUCTION-${artifact.artifactId}`, "production-data", "critical", artifact.artifactId,
      "Production data is blocked by governance policy; artifact content was withheld."));
    for (const rule of config.privacyGuardrails.patterns) {
      const pattern = new RegExp(rule.pattern, "gi");
      const matches = content.match(pattern);
      if (!matches?.length) continue;
      findings.push(finding(`PRIVACY-${artifact.artifactId}-${rule.id}`, rule.category, rule.severity, artifact.artifactId,
        `Artifact matched configured privacy rule ${rule.id}; ${matches.length} occurrence(s).`));
      const action = rule.action === "synthetic-data" && !config.privacyGuardrails.allowSyntheticData ? "block" : rule.action;
      if (action === "block") blocked = true;
      else if (action === "mask" || action === "replace") content = content.replace(pattern, config.privacyGuardrails.replacementText);
      else if (action === "synthetic-data") content = content.replace(pattern, `[SYNTHETIC:${rule.category}]`);
    }
    return { artifactId: artifact.artifactId, status: blocked ? "blocked" : "sanitized", content: blocked ? "[BLOCKED BY PRIVACY GOVERNANCE]" : content };
  });
  return { ...report("data-privacy-governance", storyKey, [findings.length === 0], findings), sanitizedArtifacts };
}

function hasCommitCycle(source: ImplementationSourceModel): boolean {
  const parents = new Map(source.commits.map((commit) => [commit.sha, commit.parentShas]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (sha: string): boolean => {
    if (visiting.has(sha)) return true;
    if (visited.has(sha)) return false;
    visiting.add(sha);
    for (const parent of parents.get(sha) ?? []) if (parents.has(parent) && visit(parent)) return true;
    visiting.delete(sha);
    visited.add(sha);
    return false;
  };
  return [...parents.keys()].some(visit);
}

export function evaluateImplementationTrust(config: GovernanceConfig, source: ImplementationSourceModel): ImplementationTrustReport {
  const findings: ImplementationTrustFinding[] = [];
  const checks: ImplementationTrustCheck[] = [];
  const policy = config.qualityGates.implementationTrust;
  if (!policy) {
    return {
      schemaVersion: "1.0.0",
      storyKey: source.storyKey,
      repository: source.repository,
      score: 0,
      decision: "blocked",
      checks: [{ id: "trust-policy", applicable: true, passed: false, description: "Implementation trust policy is not configured." }],
      findings: [{ id: "IMPL-TRUST-POLICY-MISSING", category: "trust-score", severity: "critical", description: "Implementation reconstruction requires an explicit configured trust policy.", evidenceReferences: [] }]
    };
  }

  const addCheck = (
    id: string,
    applicable: boolean,
    passed: boolean,
    category: ImplementationTrustFinding["category"],
    description: string,
    blocking = true,
    evidenceReferences: string[] = []
  ): void => {
    checks.push({ id, applicable, passed: applicable ? passed : true, description: applicable ? description : `${description} Not applicable.` });
    if (applicable && !passed) findings.push({
      id: `IMPL-TRUST-${id.toUpperCase()}`,
      category,
      severity: blocking ? "critical" : "warning",
      description,
      evidenceReferences
    });
  };

  addCheck("source-available", true, source.discoveryStatus === "available" && source.selectedSource !== null,
    "story-commit-mapping", "A usable implementation source is available.");
  if (source.reconstructionRequired !== true) {
    findings.push({ id: "IMPL-TRUST-RECONSTRUCTION-NOT-REQUIRED", category: "trust-score", severity: "critical",
      description: "Commit reconstruction trust can only be evaluated for a confirmed missing feature branch.", evidenceReferences: [] });
  }

  const storyPrApplicable = source.pullRequests.length > 0;
  addCheck("story-to-pr", storyPrApplicable,
    source.pullRequests.every((pullRequest) => pullRequest.association === "story-link" || pullRequest.association === "feature-branch-link"),
    "story-pr-mapping", "Pull requests are explicitly linked to the story or its recorded feature branch.", true,
    source.pullRequests.map((pullRequest) => pullRequest.url));

  addCheck("story-to-commit", source.reconstructionRequired === true,
    source.commits.some((commit) => commit.linkedStoryKeys.includes(source.storyKey)
      || commit.pullRequestIds.some((id) => source.pullRequests.some((pullRequest) => pullRequest.id === id))
      || source.pullRequests.some((pullRequest) => pullRequest.commitShas.includes(commit.sha) || pullRequest.mergeCommitSha === commit.sha))
      || source.repositoryDiffs.some((diff) => diff.linkedStoryKeys.includes(source.storyKey) && diff.baseSha !== diff.headSha),
    "story-commit-mapping", "A commit or explicit story-linked base/head diff identifies the implementation revision.", true,
    [...source.commits.map((commit) => commit.sha), ...source.repositoryDiffs.map((diff) => diff.reference)]);

  const mergedPullRequests = source.pullRequests.filter((pullRequest) => pullRequest.state === "merged");
  const mergeCommitApplicable = mergedPullRequests.length > 0 || source.mergeCommits.length > 0;
  const commitsBySha = new Map(source.commits.map((commit) => [commit.sha, commit]));
  const mergedPullRequestsValid = mergedPullRequests.every((pullRequest) => {
    if (!pullRequest.mergeCommitSha) return false;
    const mergeCommit = commitsBySha.get(pullRequest.mergeCommitSha);
    if (!mergeCommit) return false;
    if (pullRequest.mergeStrategy === "merge") return mergeCommit.parentShas.length >= 2;
    if (pullRequest.mergeStrategy === "squash" || pullRequest.mergeStrategy === "rebase") return mergeCommit.parentShas.length === 1;
    return false;
  });
  const unlinkedMergeCommitsValid = source.mergeCommits
    .filter((commit) => !mergedPullRequests.some((pullRequest) => pullRequest.mergeCommitSha === commit.sha))
    .every((commit) => commit.isMergeCommit && commit.parentShas.length >= 2);
  addCheck("merge-commit-validity", mergeCommitApplicable, mergedPullRequestsValid && unlinkedMergeCommitsValid,
    "merge-commit-validity", "Merge commits match their merged pull requests and expected parent structure.", policy.blockInvalidMergeCommits,
    source.mergeCommits.map((commit) => commit.sha));

  const isSupportedTarget = (branch: string): boolean => {
    const normalizedBranch = branch.toLocaleLowerCase("en-US");
    return normalizedBranch === "develop" || normalizedBranch === "main" || normalizedBranch === "release" || normalizedBranch.startsWith("release/");
  };
  const integratedPullRequest = source.pullRequests.some((pullRequest) => pullRequest.state === "merged" && isSupportedTarget(pullRequest.targetBranch));
  const integratedCommit = source.commits.some((commit) => commit.branches?.some(isSupportedTarget));
  const integratedDiff = source.repositoryDiffs.some((diff) => diff.baseBranch && isSupportedTarget(diff.baseBranch));
  addCheck("target-integration", source.reconstructionRequired === true,
    integratedPullRequest || integratedCommit || integratedDiff,
    "merge-commit-validity", "Implementation evidence is confirmed on develop, main, or a release branch.", true,
    [...source.pullRequests.filter((item) => item.state === "merged").map((item) => item.url), ...source.commits.flatMap((item) => item.branches ?? []), ...source.repositoryDiffs.flatMap((item) => item.baseBranch ? [item.baseBranch] : [])]);

  const referencedPullRequestCommits = source.pullRequests.flatMap((pullRequest) => pullRequest.commitShas);
  const commitLineageValid = source.commits.length > 0
    ? !hasCommitCycle(source) && referencedPullRequestCommits.every((sha) => commitsBySha.has(sha))
    : source.selectedSource === "repository-diff" && source.repositoryDiffs.some((diff) => diff.baseSha !== diff.headSha);
  addCheck("commit-lineage", source.reconstructionRequired === true, commitLineageValid,
    "commit-lineage", "Commit parent relationships are valid or an explicit repository base/head diff is available.", true,
    [...source.commits.map((commit) => commit.sha), ...source.repositoryDiffs.map((diff) => diff.reference)]);

  addCheck("ambiguous-sources", source.reconstructionRequired === true, source.ambiguityFindings.length === 0,
    "ambiguous-source", "Implementation source candidates resolve to a coherent lineage.", policy.blockAmbiguousSources,
    source.ambiguityFindings);
  addCheck("unrelated-commits", source.reconstructionRequired === true, source.unrelatedCommitShas.length === 0,
    "unrelated-commit", "No unrelated commits are included in the implementation source model.", policy.blockUnrelatedCommits,
    source.unrelatedCommitShas);
  addCheck("branch-mapping", source.reconstructionRequired === true,
    source.featureBranch.status === "available" && source.incorrectBranchMappings.length === 0,
    "branch-mapping", "Feature-branch and pull-request source mappings are consistent.", policy.blockIncorrectBranchMappings,
    source.incorrectBranchMappings);

  const applicableChecks = checks.filter((check) => check.applicable);
  const score = applicableChecks.length === 0 ? 0 : Math.round(applicableChecks.filter((check) => check.passed).length / applicableChecks.length * 100);
  if (score < policy.minimumScore) findings.push({
    id: "IMPL-TRUST-SCORE-BELOW-THRESHOLD",
    category: "trust-score",
    severity: "critical",
    description: `Implementation Trust Score ${score} is below configured minimum ${policy.minimumScore}.`,
    evidenceReferences: []
  });
  const decision: ImplementationTrustReport["decision"] = findings.some((item) => item.severity === "critical") ? "blocked"
    : findings.length > 0 ? "review-required" : "trusted";
  return { schemaVersion: "1.0.0", storyKey: source.storyKey, repository: source.repository, score, decision, checks, findings };
}

export interface EnterpriseQualityGateInput {
  storyKey: string;
  requirementReport: GovernanceReport;
  testReport: GovernanceReport;
  automationReport: GovernanceReport;
  performanceReport: GovernanceReport;
  hallucinationReport: HallucinationDetectionReport;
  privacyReport: DataPrivacyReport;
  coverageReport: CoverageIntelligenceReport;
  readinessReport: StoryReadinessReport;
  apiApplicable?: boolean;
  apiReport?: ApiIntelligenceReport;
  implementationReconstructionRequired?: boolean;
  implementationTrustReport?: ImplementationTrustReport;
  securityViolationCount: number;
  duplicateTestCount: number;
  criticalGovernanceFindingCount: number;
}

export interface ExecutionReadinessReport {
  schemaVersion: "1.0.0";
  storyKey: string;
  decision: "PASS" | "WARNING" | "BLOCK";
  executionReady: boolean;
  qualityScore: number;
  gates: Array<{ id: string; passed: boolean; value: number | string; threshold?: number; description: string }>;
  findings: GovernanceFinding[];
}

export function evaluateEnterpriseQualityGate(config: GovernanceConfig, input: EnterpriseQualityGateInput): ExecutionReadinessReport {
  const gates: ExecutionReadinessReport["gates"] = [];
  const findings: GovernanceFinding[] = [];
  const blockingFindings = (reportValue: GovernanceReport): GovernanceFinding[] => reportValue.findings.filter((item) => {
    if (item.category === "duplicate-test") return config.qualityGates.blockDuplicateTests;
    if (item.category === "hallucination") return config.qualityGates.blockHallucinations;
    if (item.category === "security") return config.qualityGates.blockSecurityViolations;
    if (item.category === "privacy" || item.category === "PII" || item.category.includes("identity") || item.category.includes("credential")) return config.qualityGates.blockPrivacyViolations;
    if (item.severity === "critical") return config.qualityGates.blockCriticalFindings;
    return item.severity === "warning" && config.qualityGates.warningsBlockExecution;
  });
  const requirementConfidence = input.requirementReport.confidenceScore ?? 0;
  gates.push({ id: "requirement-confidence", passed: requirementConfidence >= config.qualityGates.minimumRequirementConfidence, value: requirementConfidence, threshold: config.qualityGates.minimumRequirementConfidence, description: "Requirement confidence meets configured minimum." });
  gates.push({ id: "readiness", passed: input.readinessReport.storyKey === input.storyKey && input.readinessReport.overallReadinessScore >= config.qualityGates.minimumReadinessScore && input.readinessReport.ready, value: input.readinessReport.overallReadinessScore, threshold: config.qualityGates.minimumReadinessScore, description: "Story readiness meets configured minimum and readiness report approves execution." });
  gates.push({ id: "coverage", passed: input.coverageReport.metrics.requirementCoveragePercent >= config.qualityGates.minimumCoveragePercent, value: input.coverageReport.metrics.requirementCoveragePercent, threshold: config.qualityGates.minimumCoveragePercent, description: "Requirement coverage meets configured minimum." });
  gates.push({ id: "acceptance-criteria-coverage", passed: input.coverageReport.metrics.acceptanceCriteriaCoveragePercent >= config.qualityGates.minimumAcceptanceCriteriaCoveragePercent, value: input.coverageReport.metrics.acceptanceCriteriaCoveragePercent, threshold: config.qualityGates.minimumAcceptanceCriteriaCoveragePercent, description: "Acceptance-Criteria coverage meets configured minimum." });
  gates.push({ id: "critical-requirement-coverage", passed: input.coverageReport.metrics.criticalRequirementCoveragePercent >= config.qualityGates.minimumCriticalRequirementCoveragePercent || input.coverageReport.governance.notApplicable.some((item) => item.includes("Critical requirement")), value: input.coverageReport.metrics.criticalRequirementCoveragePercent, threshold: config.qualityGates.minimumCriticalRequirementCoveragePercent, description: "Critical requirement coverage meets configured minimum or is not applicable." });
  gates.push({ id: "high-risk-code-coverage", passed: input.coverageReport.metrics.highRiskCodeCoveragePercent >= config.qualityGates.minimumHighRiskCodeCoveragePercent || input.coverageReport.governance.notApplicable.some((item) => item.includes("High-risk code")), value: input.coverageReport.metrics.highRiskCodeCoveragePercent, threshold: config.qualityGates.minimumHighRiskCodeCoveragePercent, description: "High-risk code coverage meets configured minimum or is not applicable." });
  if (input.apiApplicable) {
    if (!input.apiReport) {
      gates.push({ id: "api-report", passed: false, value: "missing", description: "API intelligence report is required when API behavior is in scope." });
    } else {
      const apiMetrics = input.apiReport.executiveMetrics;
      gates.push({ id: "api-coverage", passed: apiMetrics.apiCoveragePercent >= config.qualityGates.minimumApiCoveragePercent, value: apiMetrics.apiCoveragePercent, threshold: config.qualityGates.minimumApiCoveragePercent, description: "API coverage meets configured minimum." });
      gates.push({ id: "api-contract-coverage", passed: apiMetrics.contractCoveragePercent >= config.qualityGates.minimumContractCoveragePercent, value: apiMetrics.contractCoveragePercent, threshold: config.qualityGates.minimumContractCoveragePercent, description: "API contract coverage meets configured minimum." });
      if (input.apiReport.coverage.criticalApis.total > 0) gates.push({ id: "critical-api-coverage", passed: input.apiReport.coverage.criticalApis.coveragePercent >= config.qualityGates.minimumCriticalApiCoveragePercent, value: input.apiReport.coverage.criticalApis.coveragePercent, threshold: config.qualityGates.minimumCriticalApiCoveragePercent, description: "Critical API coverage meets configured minimum." });
      if (input.apiReport.coverage.security.total > input.apiReport.coverage.security.notApplicable) gates.push({ id: "authentication-coverage", passed: input.apiReport.coverage.security.coveragePercent >= config.qualityGates.minimumAuthenticationCoveragePercent, value: input.apiReport.coverage.security.coveragePercent, threshold: config.qualityGates.minimumAuthenticationCoveragePercent, description: "Authentication coverage meets configured minimum." });
      if (input.apiReport.coverage.highRiskEndpoints.total > 0) gates.push({ id: "high-risk-api-coverage", passed: input.apiReport.coverage.highRiskEndpoints.coveragePercent >= config.qualityGates.minimumHighRiskApiCoveragePercent, value: input.apiReport.coverage.highRiskEndpoints.coveragePercent, threshold: config.qualityGates.minimumHighRiskApiCoveragePercent, description: "High-risk API coverage meets configured minimum." });
    }
  }
  if (input.implementationReconstructionRequired) {
    const trustPolicy = config.qualityGates.implementationTrust;
    const trustReport = input.implementationTrustReport;
    const trustPassed = Boolean(trustPolicy && trustReport
      && trustReport.storyKey === input.storyKey
      && trustReport.decision === "trusted"
      && trustReport.score >= trustPolicy.minimumScore);
    gates.push({ id: "implementation-trust", passed: trustPassed, value: trustReport?.score ?? "missing",
      ...(trustPolicy ? { threshold: trustPolicy.minimumScore } : {}),
      description: "Implementation reconstruction has an approved trust report meeting configured policy." });
    if (!trustPassed) findings.push(finding("QUALITY-IMPLEMENTATION-TRUST", "implementation-trust", "critical", input.storyKey,
      trustPolicy ? "A passing implementation trust report is required before reconstruction-dependent execution." : "Implementation trust policy is not configured."));
  }
  const duplicateTestFindings = input.testReport.findings.filter((item) => item.category === "duplicate-test").length;
  const duplicateTestCount = Math.max(input.duplicateTestCount, duplicateTestFindings);
  if (config.qualityGates.blockDuplicateTests) gates.push({ id: "duplicate-tests", passed: duplicateTestCount === 0, value: duplicateTestCount, description: "No duplicate tests are present." });
  if (config.qualityGates.blockHallucinations) gates.push({ id: "hallucinations", passed: input.hallucinationReport.findings.every((item) => item.category !== "hallucination"), value: input.hallucinationReport.findings.filter((item) => item.category === "hallucination").length, description: "No hallucinated references are present." });
  const scriptSecurityFindings = input.automationReport.findings.filter((item) => item.category === "security").length;
  const securityViolationCount = Math.max(input.securityViolationCount, scriptSecurityFindings);
  if (config.qualityGates.blockSecurityViolations) gates.push({ id: "security", passed: securityViolationCount === 0, value: securityViolationCount, description: "No security violations are present." });
  const privacyViolations = input.privacyReport.findings.filter((item) => item.severity === "critical").length + input.privacyReport.sanitizedArtifacts.filter((artifact) => artifact.status === "blocked").length;
  if (config.qualityGates.blockPrivacyViolations) gates.push({ id: "privacy", passed: privacyViolations === 0, value: privacyViolations, description: "No blocked or critical privacy violations are present." });
  const reports = [input.requirementReport, input.testReport, input.automationReport, input.performanceReport, input.hallucinationReport, input.privacyReport];
  const criticalGovernanceFindings = Math.max(input.criticalGovernanceFindingCount, reports.reduce((total, reportValue) => total + reportValue.findings.filter((item) => item.severity === "critical").length, 0));
  if (config.qualityGates.blockCriticalFindings) gates.push({ id: "critical-governance", passed: criticalGovernanceFindings === 0, value: criticalGovernanceFindings, description: "No critical governance findings are present." });
  for (const current of reports) findings.push(...blockingFindings(current));
  if (input.coverageReport.governance.failures.length > 0) findings.push(finding("QUALITY-COVERAGE-GOVERNANCE", "coverage", "critical", input.storyKey,
    "Coverage governance has failed configured thresholds.", input.coverageReport.governance.failures));
  const failedGates = gates.filter((gate) => !gate.passed);
  for (const gate of failedGates) findings.push(finding(`QUALITY-GATE-${gate.id}`, gate.id, "critical", input.storyKey, gate.description));
  const blocking = findings.some((item) => item.severity === "critical");
  const warning = reports.some((item) => item.status === "WARNING") || input.coverageReport.governance.ready === false;
  const decision: ExecutionReadinessReport["decision"] = blocking ? "BLOCK" : warning ? "WARNING" : "PASS";
  const executionReady = decision === "PASS" || (decision === "WARNING" && !config.qualityGates.warningsBlockExecution);
  return {
    schemaVersion: "1.0.0",
    storyKey: input.storyKey,
    decision,
    executionReady,
    qualityScore: gates.length === 0 ? 0 : Math.round(gates.filter((gate) => gate.passed).length / gates.length * 100),
    gates,
    findings
  };
}

export function assertExecutionReady(readiness: ExecutionReadinessReport): void {
  if (!readiness.executionReady) throw new Error(`Execution is blocked by enterprise quality gate: ${readiness.decision}.`);
}

export async function writeGovernanceReport(reportValue: unknown, outputDirectory: string, fileName: string): Promise<void> {
  await writeJsonArtifact(reportValue, outputDirectory, fileName);
}