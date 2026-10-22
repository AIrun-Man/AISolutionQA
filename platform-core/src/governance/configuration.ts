import { readFile } from "node:fs/promises";

export type GovernanceSeverity = "info" | "warning" | "critical";
export type PrivacyAction = "mask" | "replace" | "block" | "synthetic-data";

export interface RequirementGuardrails {
  minimumConfidence: number;
  minimumAcceptanceCriteria: number;
  minimumBusinessRules: number;
  maximumAmbiguousAcceptanceCriteria: number;
  duplicateStoryConfidenceThreshold: number;
  requiredBusinessContextFields: string[];
  ambiguityPatterns: string[];
  blockMissingDependencies: boolean;
}

export interface TestGenerationGuardrails {
  minimumCoveragePercent: number;
  minimumRiskCoveragePercent: number;
  minimumExpectedResultLength: number;
  minimumAssertionReferences: number;
  detectDuplicateTests: boolean;
  detectDuplicateScenarios: boolean;
  requireValidUserJourneys: boolean;
  blockRedundantCoverage: boolean;
}

export interface AutomationGuardrails {
  requireFrameworkCompliance: boolean;
  requirePageObjects: boolean;
  requireUtilityReuse: boolean;
  requireAssertions: boolean;
  requireTestTraceability: boolean;
  detectDuplicateLocators: boolean;
  detectDuplicateScripts: boolean;
  duplicateLocatorSeverity: GovernanceSeverity;
  namingPattern: string;
  frameworkComplianceMarkers: string[];
  prohibitedPatterns: Array<{ id: string; pattern: string; description: string; severity: GovernanceSeverity }>;
  minimumAssertionCount: number;
}

export interface PerformanceGuardrails {
  enabled: boolean;
  blockProduction: boolean;
  maximumUsers: number;
  maximumDurationSeconds: number;
  maximumRampRate: number;
  maximumRequestRate: number;
  maximumTestSize: number;
  maximumParallelExecutions: number;
  allowedEnvironments: string[];
}

export interface HallucinationGuardrails {
  blockUnknownReferences: boolean;
  minimumEvidenceReferences: number;
  blockUnsupportedBusinessRules: boolean;
}

export interface PrivacyPattern {
  id: string;
  category: string;
  pattern: string;
  action: PrivacyAction;
  severity: GovernanceSeverity;
}

export interface PrivacyGuardrails {
  defaultAction: PrivacyAction;
  blockProductionData: boolean;
  allowSyntheticData: boolean;
  replacementText: string;
  patterns: PrivacyPattern[];
}

export interface ImplementationTrustGuardrails {
  minimumScore: number;
  blockAmbiguousSources: boolean;
  blockUnrelatedCommits: boolean;
  blockInvalidMergeCommits: boolean;
  blockIncorrectBranchMappings: boolean;
}

export interface EnterpriseQualityGates {
  minimumRequirementConfidence: number;
  minimumCoveragePercent: number;
  minimumAcceptanceCriteriaCoveragePercent: number;
  minimumCriticalRequirementCoveragePercent: number;
  minimumHighRiskCodeCoveragePercent: number;
  minimumApiCoveragePercent: number;
  minimumContractCoveragePercent: number;
  minimumCriticalApiCoveragePercent: number;
  minimumAuthenticationCoveragePercent: number;
  minimumHighRiskApiCoveragePercent: number;
  minimumReadinessScore: number;
  blockDuplicateTests: boolean;
  blockHallucinations: boolean;
  blockSecurityViolations: boolean;
  blockPrivacyViolations: boolean;
  blockCriticalFindings: boolean;
  warningsBlockExecution: boolean;
  implementationTrust?: ImplementationTrustGuardrails;
}

export interface GovernanceConfig {
  schemaVersion: "1.0.0";
  requirementGuardrails: RequirementGuardrails;
  testGenerationGuardrails: TestGenerationGuardrails;
  automationGuardrails: AutomationGuardrails;
  performanceGuardrails: PerformanceGuardrails;
  hallucinationGuardrails: HallucinationGuardrails;
  privacyGuardrails: PrivacyGuardrails;
  qualityGates: EnterpriseQualityGates;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function assertAllowedKeys(source: Record<string, unknown>, allowedKeys: string[], label: string): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(source).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`Unknown ${label} fields: ${unknown.join(", ")}.`);
}

function numberField(source: Record<string, unknown>, key: string, label: string, integer = false, maximum = 100): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum || (integer && !Number.isInteger(value))) {
    throw new Error(`${label}.${key} must be a ${integer ? `non-negative integer no greater than ${maximum}` : `number from 0 to ${maximum}`}.`);
  }
  return value;
}

function booleanField(source: Record<string, unknown>, key: string, label: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") throw new Error(`${label}.${key} must be a boolean.`);
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
  return value;
}

function validatePattern(value: unknown, label: string): void {
  if (typeof value !== "string" || !value) throw new Error(`${label} must be a non-empty regular expression.`);
  try {
    new RegExp(value, "i");
  } catch {
    throw new Error(`${label} is not a valid regular expression.`);
  }
}

export function validateGovernanceConfig(value: unknown): GovernanceConfig {
  const root = record(value, "Governance configuration");
  if (root.schemaVersion !== "1.0.0") throw new Error("Governance configuration schemaVersion must be 1.0.0.");
  assertAllowedKeys(root, ["schemaVersion", "requirementGuardrails", "testGenerationGuardrails", "automationGuardrails", "performanceGuardrails", "hallucinationGuardrails", "privacyGuardrails", "qualityGates"], "governance configuration");
  const requirements = record(root.requirementGuardrails, "requirementGuardrails");
  const tests = record(root.testGenerationGuardrails, "testGenerationGuardrails");
  const automation = record(root.automationGuardrails, "automationGuardrails");
  const performance = record(root.performanceGuardrails, "performanceGuardrails");
  const hallucination = record(root.hallucinationGuardrails, "hallucinationGuardrails");
  const privacy = record(root.privacyGuardrails, "privacyGuardrails");
  const quality = record(root.qualityGates, "qualityGates");
  assertAllowedKeys(requirements, ["minimumConfidence", "minimumAcceptanceCriteria", "minimumBusinessRules", "maximumAmbiguousAcceptanceCriteria", "duplicateStoryConfidenceThreshold", "requiredBusinessContextFields", "ambiguityPatterns", "blockMissingDependencies"], "requirementGuardrails");
  assertAllowedKeys(tests, ["minimumCoveragePercent", "minimumRiskCoveragePercent", "minimumExpectedResultLength", "minimumAssertionReferences", "detectDuplicateTests", "detectDuplicateScenarios", "requireValidUserJourneys", "blockRedundantCoverage"], "testGenerationGuardrails");
  assertAllowedKeys(automation, ["requireFrameworkCompliance", "requirePageObjects", "requireUtilityReuse", "requireAssertions", "requireTestTraceability", "detectDuplicateLocators", "detectDuplicateScripts", "duplicateLocatorSeverity", "namingPattern", "frameworkComplianceMarkers", "minimumAssertionCount", "prohibitedPatterns"], "automationGuardrails");
  assertAllowedKeys(performance, ["enabled", "blockProduction", "maximumUsers", "maximumDurationSeconds", "maximumRampRate", "maximumRequestRate", "maximumTestSize", "maximumParallelExecutions", "allowedEnvironments"], "performanceGuardrails");
  assertAllowedKeys(hallucination, ["blockUnknownReferences", "minimumEvidenceReferences", "blockUnsupportedBusinessRules"], "hallucinationGuardrails");
  assertAllowedKeys(privacy, ["defaultAction", "blockProductionData", "allowSyntheticData", "replacementText", "patterns"], "privacyGuardrails");
  assertAllowedKeys(quality, ["minimumRequirementConfidence", "minimumCoveragePercent", "minimumAcceptanceCriteriaCoveragePercent", "minimumCriticalRequirementCoveragePercent", "minimumHighRiskCodeCoveragePercent", "minimumApiCoveragePercent", "minimumContractCoveragePercent", "minimumCriticalApiCoveragePercent", "minimumAuthenticationCoveragePercent", "minimumHighRiskApiCoveragePercent", "minimumReadinessScore", "blockDuplicateTests", "blockHallucinations", "blockSecurityViolations", "blockPrivacyViolations", "blockCriticalFindings", "warningsBlockExecution", "implementationTrust"], "qualityGates");

  let implementationTrust: ImplementationTrustGuardrails | undefined;
  if (quality.implementationTrust !== undefined) {
    const trust = record(quality.implementationTrust, "qualityGates.implementationTrust");
    assertAllowedKeys(trust, ["minimumScore", "blockAmbiguousSources", "blockUnrelatedCommits", "blockInvalidMergeCommits", "blockIncorrectBranchMappings"], "qualityGates.implementationTrust");
    implementationTrust = {
      minimumScore: numberField(trust, "minimumScore", "qualityGates.implementationTrust"),
      blockAmbiguousSources: booleanField(trust, "blockAmbiguousSources", "qualityGates.implementationTrust"),
      blockUnrelatedCommits: booleanField(trust, "blockUnrelatedCommits", "qualityGates.implementationTrust"),
      blockInvalidMergeCommits: booleanField(trust, "blockInvalidMergeCommits", "qualityGates.implementationTrust"),
      blockIncorrectBranchMappings: booleanField(trust, "blockIncorrectBranchMappings", "qualityGates.implementationTrust")
    };
  }

  const ambiguityPatterns = stringArray(requirements.ambiguityPatterns, "requirementGuardrails.ambiguityPatterns");
  ambiguityPatterns.forEach((pattern) => validatePattern(pattern, "requirementGuardrails.ambiguityPatterns item"));
  if (!Array.isArray(automation.prohibitedPatterns)) throw new Error("automationGuardrails.prohibitedPatterns must be an array.");
  for (const [index, value] of automation.prohibitedPatterns.entries()) {
    const item = record(value, `automationGuardrails.prohibitedPatterns[${index}]`);
    assertAllowedKeys(item, ["id", "pattern", "description", "severity"], `automationGuardrails.prohibitedPatterns[${index}]`);
    validatePattern(item.pattern, `automationGuardrails.prohibitedPatterns[${index}].pattern`);
    if (typeof item.id !== "string" || typeof item.description !== "string" || !["info", "warning", "critical"].includes(String(item.severity))) {
      throw new Error(`automationGuardrails.prohibitedPatterns[${index}] is incomplete.`);
    }
  }
  if (!Array.isArray(privacy.patterns)) throw new Error("privacyGuardrails.patterns must be an array.");
  for (const [index, value] of privacy.patterns.entries()) {
    const item = record(value, `privacyGuardrails.patterns[${index}]`);
    assertAllowedKeys(item, ["id", "category", "pattern", "action", "severity"], `privacyGuardrails.patterns[${index}]`);
    validatePattern(item.pattern, `privacyGuardrails.patterns[${index}].pattern`);
    if (typeof item.id !== "string" || typeof item.category !== "string" || !["mask", "replace", "block", "synthetic-data"].includes(String(item.action)) || !["info", "warning", "critical"].includes(String(item.severity))) {
      throw new Error(`privacyGuardrails.patterns[${index}] is incomplete.`);
    }
  }
  validatePattern(automation.namingPattern, "automationGuardrails.namingPattern");
  if (!["info", "warning", "critical"].includes(String(automation.duplicateLocatorSeverity))) {
    throw new Error("automationGuardrails.duplicateLocatorSeverity must be info, warning, or critical.");
  }
  if (!["mask", "replace", "block", "synthetic-data"].includes(String(privacy.defaultAction))) {
    throw new Error("privacyGuardrails.defaultAction is unsupported.");
  }

  const config: GovernanceConfig = {
    schemaVersion: "1.0.0",
    requirementGuardrails: {
      minimumConfidence: numberField(requirements, "minimumConfidence", "requirementGuardrails"),
      minimumAcceptanceCriteria: numberField(requirements, "minimumAcceptanceCriteria", "requirementGuardrails", true),
      minimumBusinessRules: numberField(requirements, "minimumBusinessRules", "requirementGuardrails", true),
      maximumAmbiguousAcceptanceCriteria: numberField(requirements, "maximumAmbiguousAcceptanceCriteria", "requirementGuardrails", true),
      duplicateStoryConfidenceThreshold: numberField(requirements, "duplicateStoryConfidenceThreshold", "requirementGuardrails"),
      requiredBusinessContextFields: stringArray(requirements.requiredBusinessContextFields, "requirementGuardrails.requiredBusinessContextFields"),
      ambiguityPatterns,
      blockMissingDependencies: booleanField(requirements, "blockMissingDependencies", "requirementGuardrails")
    },
    testGenerationGuardrails: {
      minimumCoveragePercent: numberField(tests, "minimumCoveragePercent", "testGenerationGuardrails"),
      minimumRiskCoveragePercent: numberField(tests, "minimumRiskCoveragePercent", "testGenerationGuardrails"),
      minimumExpectedResultLength: numberField(tests, "minimumExpectedResultLength", "testGenerationGuardrails", true),
      minimumAssertionReferences: numberField(tests, "minimumAssertionReferences", "testGenerationGuardrails", true),
      detectDuplicateTests: booleanField(tests, "detectDuplicateTests", "testGenerationGuardrails"),
      detectDuplicateScenarios: booleanField(tests, "detectDuplicateScenarios", "testGenerationGuardrails"),
      requireValidUserJourneys: booleanField(tests, "requireValidUserJourneys", "testGenerationGuardrails"),
      blockRedundantCoverage: booleanField(tests, "blockRedundantCoverage", "testGenerationGuardrails")
    },
    automationGuardrails: {
      requireFrameworkCompliance: booleanField(automation, "requireFrameworkCompliance", "automationGuardrails"),
      requirePageObjects: booleanField(automation, "requirePageObjects", "automationGuardrails"),
      requireUtilityReuse: booleanField(automation, "requireUtilityReuse", "automationGuardrails"),
      requireAssertions: booleanField(automation, "requireAssertions", "automationGuardrails"),
      requireTestTraceability: booleanField(automation, "requireTestTraceability", "automationGuardrails"),
      detectDuplicateLocators: booleanField(automation, "detectDuplicateLocators", "automationGuardrails"),
      detectDuplicateScripts: booleanField(automation, "detectDuplicateScripts", "automationGuardrails"),
      duplicateLocatorSeverity: automation.duplicateLocatorSeverity as GovernanceSeverity,
      namingPattern: String(automation.namingPattern),
      frameworkComplianceMarkers: stringArray(automation.frameworkComplianceMarkers, "automationGuardrails.frameworkComplianceMarkers"),
      prohibitedPatterns: automation.prohibitedPatterns as AutomationGuardrails["prohibitedPatterns"],
      minimumAssertionCount: numberField(automation, "minimumAssertionCount", "automationGuardrails", true)
    },
    performanceGuardrails: {
      enabled: booleanField(performance, "enabled", "performanceGuardrails"),
      blockProduction: booleanField(performance, "blockProduction", "performanceGuardrails"),
      maximumUsers: numberField(performance, "maximumUsers", "performanceGuardrails", true, Number.MAX_SAFE_INTEGER),
      maximumDurationSeconds: numberField(performance, "maximumDurationSeconds", "performanceGuardrails", true, Number.MAX_SAFE_INTEGER),
      maximumRampRate: numberField(performance, "maximumRampRate", "performanceGuardrails", false, Number.MAX_SAFE_INTEGER),
      maximumRequestRate: numberField(performance, "maximumRequestRate", "performanceGuardrails", false, Number.MAX_SAFE_INTEGER),
      maximumTestSize: numberField(performance, "maximumTestSize", "performanceGuardrails", true, Number.MAX_SAFE_INTEGER),
      maximumParallelExecutions: numberField(performance, "maximumParallelExecutions", "performanceGuardrails", true, Number.MAX_SAFE_INTEGER),
      allowedEnvironments: stringArray(performance.allowedEnvironments, "performanceGuardrails.allowedEnvironments")
    },
    hallucinationGuardrails: {
      blockUnknownReferences: booleanField(hallucination, "blockUnknownReferences", "hallucinationGuardrails"),
      minimumEvidenceReferences: numberField(hallucination, "minimumEvidenceReferences", "hallucinationGuardrails", true),
      blockUnsupportedBusinessRules: booleanField(hallucination, "blockUnsupportedBusinessRules", "hallucinationGuardrails")
    },
    privacyGuardrails: {
      defaultAction: privacy.defaultAction as PrivacyAction,
      blockProductionData: booleanField(privacy, "blockProductionData", "privacyGuardrails"),
      allowSyntheticData: booleanField(privacy, "allowSyntheticData", "privacyGuardrails"),
      replacementText: typeof privacy.replacementText === "string" ? privacy.replacementText : (() => { throw new Error("privacyGuardrails.replacementText must be a string."); })(),
      patterns: privacy.patterns as PrivacyPattern[]
    },
    qualityGates: {
      minimumRequirementConfidence: numberField(quality, "minimumRequirementConfidence", "qualityGates"),
      minimumCoveragePercent: numberField(quality, "minimumCoveragePercent", "qualityGates"),
      minimumAcceptanceCriteriaCoveragePercent: numberField(quality, "minimumAcceptanceCriteriaCoveragePercent", "qualityGates"),
      minimumCriticalRequirementCoveragePercent: numberField(quality, "minimumCriticalRequirementCoveragePercent", "qualityGates"),
      minimumHighRiskCodeCoveragePercent: numberField(quality, "minimumHighRiskCodeCoveragePercent", "qualityGates"),
      minimumApiCoveragePercent: numberField(quality, "minimumApiCoveragePercent", "qualityGates"),
      minimumContractCoveragePercent: numberField(quality, "minimumContractCoveragePercent", "qualityGates"),
      minimumCriticalApiCoveragePercent: numberField(quality, "minimumCriticalApiCoveragePercent", "qualityGates"),
      minimumAuthenticationCoveragePercent: numberField(quality, "minimumAuthenticationCoveragePercent", "qualityGates"),
      minimumHighRiskApiCoveragePercent: numberField(quality, "minimumHighRiskApiCoveragePercent", "qualityGates"),
      minimumReadinessScore: numberField(quality, "minimumReadinessScore", "qualityGates"),
      blockDuplicateTests: booleanField(quality, "blockDuplicateTests", "qualityGates"),
      blockHallucinations: booleanField(quality, "blockHallucinations", "qualityGates"),
      blockSecurityViolations: booleanField(quality, "blockSecurityViolations", "qualityGates"),
      blockPrivacyViolations: booleanField(quality, "blockPrivacyViolations", "qualityGates"),
      blockCriticalFindings: booleanField(quality, "blockCriticalFindings", "qualityGates"),
      warningsBlockExecution: booleanField(quality, "warningsBlockExecution", "qualityGates"),
      ...(implementationTrust ? { implementationTrust } : {})
    }
  };
  return config;
}

export async function loadGovernanceConfig(configPath: string): Promise<GovernanceConfig> {
  const raw: unknown = JSON.parse(await readFile(configPath, "utf8"));
  return validateGovernanceConfig(raw);
}