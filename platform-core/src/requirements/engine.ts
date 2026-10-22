import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  validateRequirementAnalysis,
  type AcceptanceCriterion,
  type JiraStory,
  type JiraStoryContext,
  type Priority,
  type RequirementAnalysis,
  type RequirementScenario,
  type ScenarioCategory
} from "../models/requirements.js";

export interface RequirementAnalysisInput {
  story: JiraStory;
  acceptanceCriteria: AcceptanceCriterion[];
  jiraContext?: JiraStoryContext;
}

export interface SourceFileEvidence {
  path: string;
  content: string;
}

export type ImplementationStatus = "implemented" | "partially-implemented" | "missing";

export interface RequirementCodeFinding {
  requirementId: string;
  requirementType: "functional" | "non-functional" | "business-rule" | "validation" | "implicit";
  acceptanceCriteriaIds: string[];
  status: ImplementationStatus;
  confidence: number;
  matchedTerms: string[];
  evidenceFiles: string[];
}

export interface RequirementCodeValidationReport {
  storyKey: string;
  findings: RequirementCodeFinding[];
  implementedCount: number;
  partiallyImplementedCount: number;
  missingCount: number;
  sourceFilesExamined: number;
}

const negativePattern = /\b(?:must not|mustn't|should not|shouldn't|cannot|can't|invalid|unauthorized|denied|reject(?:s|ed)?|forbid(?:s|den)?|fail(?:s|ed|ure)?|prevent(?:s|ed)?|without|missing|expired|not allowed)\b/i;
const boundaryPattern = /\b(?:minimum|maximum|at least|at most|no more than|no less than|up to|between|within|limit|boundary|zero|empty|exactly|first|last)\b|\b[0-9]+\b/i;
const businessRulePattern = /\b(?:must|must not|mustn't|only|at least|at most|no more than|no less than|maximum|minimum|up to|exactly|within|unless|except|before|after)\b/i;
const riskPattern = /\b(?:security|privacy|sensitive|fraud|payment|financial|audit|data loss|unauthorized)\b/i;
const validationPattern = /\b(?:validat(?:e|es|ed|ion)|invalid|malformed|required field|format|formatted|constraint|length|between|minimum|maximum|at least|at most)\b/i;
const nonFunctionalPattern = /\b(?:performance|response time|latency|throughput|availability|reliability|scalability|accessibility|usability|security|privacy|sensitive|encrypt(?:ed|ion)|auditability)\b/i;
const authorizationPattern = /\b(?:authori[sz](?:e|ed|ation)|unauthori[sz]ed|permission|role-based|administrator role|access control|privilege)\b/i;
const integrationPattern = /\b(?:integrat(?:e|es|ed|ion)|service-to-service|third-party service|external.{0,30}service|message queue|event bus|webhook)\b/i;
const securityPattern = /\b(?:security|secure|authentication|authorization|permission|role(?:-based)?|access(?: control)?|privilege|privacy|sensitive|unauthorized)\b/i;
const regressionPattern = /\b(?:regression|backward compatibility|existing behavior|previously supported)\b/i;

const scenarioPrefixes: Record<ScenarioCategory, string> = {
  functional: "FS",
  negative: "NS",
  boundary: "BS",
  risk: "RS",
  validation: "VS",
  authorization: "AUTH",
  security: "SS",
  integration: "INT",
  regression: "GS"
};

interface ScenarioText {
  preconditions: string[];
  action: string;
  expectedOutcome: string;
}

function scenarioText(criterion: AcceptanceCriterion): ScenarioText {
  const gherkin = criterion.description.match(/\bGiven\s+([\s\S]+?)\s*,?\s*When\s+([\s\S]+?)\s*,?\s*Then\s+([\s\S]+)$/i);
  if (gherkin) {
    return {
      preconditions: [gherkin[1].trim().replace(/[,;\s]+$/, "")],
      action: gherkin[2].trim().replace(/[,;\s]+$/, ""),
      expectedOutcome: gherkin[3].trim()
    };
  }
  return {
    preconditions: [],
    action: `Exercise acceptance criterion ${criterion.id}.`,
    expectedOutcome: criterion.description
  };
}

function categoriesFor(description: string, storyText: string): ScenarioCategory[] {
  const categories: ScenarioCategory[] = [];
  if (negativePattern.test(description)) categories.push("negative");
  if (boundaryPattern.test(description)) categories.push("boundary");
  if (validationPattern.test(description)) categories.push("validation");
  if (authorizationPattern.test(description)) categories.push("authorization");
  if (securityPattern.test(`${storyText} ${description}`)) categories.push("security");
  if (integrationPattern.test(description)) categories.push("integration");
  if (riskPattern.test(`${storyText} ${description}`)) categories.push("risk");
  if (regressionPattern.test(description)) categories.push("regression");
  if (categories.length === 0) categories.push("functional");
  return categories;
}

function assertValidAnalysis(analysis: RequirementAnalysis): void {
  const validation = validateRequirementAnalysis(analysis);
  if (!validation.valid) {
    throw new Error(`Requirement analysis is invalid: ${validation.errors.join(" ")}`);
  }
}

export function analyzeRequirements(input: RequirementAnalysisInput): RequirementAnalysis {
  if (input.acceptanceCriteria.length === 0) {
    throw new Error("At least one Acceptance Criterion is required.");
  }

  const storyText = `${input.story.summary} ${input.story.description}`;
  const scenarioCounts: Record<ScenarioCategory, number> = {
    functional: 0,
    negative: 0,
    boundary: 0,
    risk: 0,
    validation: 0,
    authorization: 0,
    security: 0,
    integration: 0,
    regression: 0
  };
  const scenarios: RequirementScenario[] = [];
  const businessRules: NonNullable<RequirementAnalysis["businessRules"]> = [];
  const nonFunctionalRequirements: NonNullable<RequirementAnalysis["nonFunctionalRequirements"]> = [];
  const validationRules: NonNullable<RequirementAnalysis["validationRules"]> = [];
  const risks: NonNullable<RequirementAnalysis["risks"]> = [];
  const automationCandidates: NonNullable<RequirementAnalysis["automationCandidates"]> = [];

  const functionalRequirements = input.acceptanceCriteria.filter((criterion) => !nonFunctionalPattern.test(criterion.description)).map((criterion, index) => ({
    id: `FR-${index + 1}`,
    description: criterion.description,
    acceptanceCriteriaIds: [criterion.id]
  }));

  for (const criterion of input.acceptanceCriteria) {
    if (nonFunctionalPattern.test(criterion.description)) {
      nonFunctionalRequirements.push({
        id: `NFR-${nonFunctionalRequirements.length + 1}`,
        description: criterion.description,
        acceptanceCriteriaIds: [criterion.id]
      });
    }
    if (validationPattern.test(criterion.description)) {
      validationRules.push({
        id: `VR-${validationRules.length + 1}`,
        description: criterion.description,
        acceptanceCriteriaIds: [criterion.id]
      });
    }
    if (riskPattern.test(`${storyText} ${criterion.description}`)) {
      risks.push({
        id: `RISK-${risks.length + 1}`,
        description: criterion.description,
        rationale: `Risk signal is explicitly stated in ${criterion.id}.`,
        priority: "medium",
        acceptanceCriteriaIds: [criterion.id]
      });
    }
    if (businessRulePattern.test(criterion.description)) {
      businessRules.push({
        id: `BR-${businessRules.length + 1}`,
        description: criterion.description,
        acceptanceCriteriaIds: [criterion.id]
      });
    }

    for (const category of categoriesFor(criterion.description, storyText)) {
      scenarioCounts[category] += 1;
      const scenarioId = `${scenarioPrefixes[category]}-${scenarioCounts[category]}`;
      const text = scenarioText(criterion);
      const scenario: RequirementScenario = {
        id: scenarioId,
        category,
        title: criterion.description,
        objective: `Verify acceptance criterion ${criterion.id}.`,
        priority: "medium" satisfies Priority,
        preconditions: text.preconditions,
        steps: [{ sequence: 1, action: text.action, expectedOutcome: text.expectedOutcome }],
        expectedResult: text.expectedOutcome,
        acceptanceCriteriaIds: [criterion.id]
      };
      scenarios.push(scenario);
      automationCandidates.push({
        id: `AUT-CAND-${automationCandidates.length + 1}`,
        scenarioId,
        acceptanceCriteriaIds: [criterion.id],
        rationale: `The outcome for ${criterion.id} is stated and can be assessed after application discovery.`
      });
    }
  }

  const analysis: RequirementAnalysis = {
    schemaVersion: "1.0.0",
    analysisId: `RA-${input.story.key}`,
    story: input.story,
    acceptanceCriteria: input.acceptanceCriteria,
    functionalRequirements,
    nonFunctionalRequirements,
    businessRules,
    validationRules,
    implicitRequirements: [],
    assumptions: [],
    risks,
    scenarios,
    automationCandidates,
    ...(input.jiraContext ? { jiraContext: input.jiraContext } : {})
  };
  assertValidAnalysis(analysis);
  return analysis;
}

export async function writeRequirementAnalysis(analysis: RequirementAnalysis, outputDirectory: string): Promise<void> {
  assertValidAnalysis(analysis);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "requirement-analysis.json"), JSON.stringify(analysis, null, 2), "utf8");
}

const ignoredRequirementTerms = new Set([
  "about", "after", "allow", "allows", "before", "being", "does", "each", "from", "have", "into", "must",
  "only", "should", "that", "their", "them", "then", "this", "when", "where", "which", "with", "user"
]);

function requirementTerms(description: string): string[] {
  return [...new Set(description.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? [])]
    .filter((term) => !ignoredRequirementTerms.has(term));
}

export function validateRequirementsAgainstCode(
  analysis: RequirementAnalysis,
  sourceFiles: SourceFileEvidence[]
): RequirementCodeValidationReport {
  assertValidAnalysis(analysis);
  const requirements = [
    ...(analysis.functionalRequirements ?? analysis.acceptanceCriteria.map((criterion, index) => ({
      id: `FR-${index + 1}`,
      description: criterion.description,
      acceptanceCriteriaIds: [criterion.id]
    }))).map((requirement) => ({ ...requirement, requirementType: "functional" as const })),
    ...(analysis.nonFunctionalRequirements ?? []).map((requirement) => ({ ...requirement, requirementType: "non-functional" as const })),
    ...(analysis.businessRules ?? []).map((rule) => ({ ...rule, requirementType: "business-rule" as const })),
    ...(analysis.validationRules ?? []).map((rule) => ({ ...rule, requirementType: "validation" as const })),
    ...(analysis.implicitRequirements ?? []).map((requirement) => ({ ...requirement, requirementType: "implicit" as const }))
  ];

  const findings = requirements.map((requirement): RequirementCodeFinding => {
    const terms = requirementTerms(requirement.description);
    const matchingFiles = sourceFiles.map((file) => ({
      path: file.path,
      corpus: `${file.path}\n${file.content}`.toLowerCase()
    }));
    const matchedTerms = terms.filter((term) => matchingFiles.some((file) => file.corpus.includes(term)));
    const evidenceFiles = matchingFiles
      .filter((file) => terms.some((term) => file.corpus.includes(term)))
      .map((file) => file.path);
    const confidence = terms.length === 0 ? 0 : Math.round((matchedTerms.length / terms.length) * 100) / 100;
    const hasDirectTrace = sourceFiles.some((file) => file.content.includes(requirement.id));
    const status: ImplementationStatus = hasDirectTrace || (matchedTerms.length >= 2 && confidence >= 0.75)
      ? "implemented"
      : matchedTerms.length > 0
        ? "partially-implemented"
        : "missing";

    return {
      requirementId: requirement.id,
      requirementType: requirement.requirementType,
      acceptanceCriteriaIds: [...requirement.acceptanceCriteriaIds],
      status,
      confidence: hasDirectTrace ? 1 : confidence,
      matchedTerms,
      evidenceFiles
    };
  });

  return {
    storyKey: analysis.story.key,
    findings,
    implementedCount: findings.filter((finding) => finding.status === "implemented").length,
    partiallyImplementedCount: findings.filter((finding) => finding.status === "partially-implemented").length,
    missingCount: findings.filter((finding) => finding.status === "missing").length,
    sourceFilesExamined: sourceFiles.length
  };
}