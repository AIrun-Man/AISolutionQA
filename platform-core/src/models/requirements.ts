export type Priority = "critical" | "high" | "medium" | "low";
export type ScenarioCategory = "functional" | "negative" | "boundary" | "risk" | "validation" | "authorization" | "security" | "integration" | "regression";

export interface JiraStory {
  key: string;
  summary: string;
  description: string;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
}

export interface ScenarioStep {
  sequence: number;
  action: string;
  expectedOutcome: string;
}

export interface RequirementScenario {
  id: string;
  category: ScenarioCategory;
  title: string;
  objective: string;
  priority: Priority;
  preconditions: string[];
  steps: ScenarioStep[];
  expectedResult: string;
  acceptanceCriteriaIds: string[];
}

export interface FunctionalRequirement {
  id: string;
  description: string;
  acceptanceCriteriaIds: string[];
}

export interface BusinessRule {
  id: string;
  description: string;
  acceptanceCriteriaIds: string[];
}

export interface RequirementStatement {
  id: string;
  description: string;
  acceptanceCriteriaIds: string[];
}

export interface RequirementAssumption {
  id: string;
  description: string;
  rationale: string;
}

export interface RequirementRisk {
  id: string;
  description: string;
  rationale: string;
  priority: Priority;
  acceptanceCriteriaIds: string[];
}

export interface AutomationCandidate {
  id: string;
  scenarioId: string;
  acceptanceCriteriaIds: string[];
  rationale: string;
}

export interface JiraLinkedDefect {
  key: string;
  summary: string;
  status: string;
}

export type JiraIssueRelationship = "linked-story" | "parent-story" | "child-story" | "epic" | "enhancement" | "defect";

export interface JiraRelatedIssue {
  key: string;
  summary: string;
  status: string;
  relationship: JiraIssueRelationship;
  url?: string;
}

export interface JiraCommentReference {
  id: string;
  updatedAt?: string;
}

export interface JiraStoryContext {
  sourceUrl: string;
  retrievedAt: string;
  metadata: Record<string, string | number | boolean | null>;
  linkedDefects: JiraLinkedDefect[];
  commentReferences: JiraCommentReference[];
  relatedIssues?: JiraRelatedIssue[];
}

export interface RequirementAnalysis {
  schemaVersion: "1.0.0";
  analysisId: string;
  story: JiraStory;
  acceptanceCriteria: AcceptanceCriterion[];
  scenarios: RequirementScenario[];
  functionalRequirements?: FunctionalRequirement[];
  nonFunctionalRequirements?: RequirementStatement[];
  businessRules?: BusinessRule[];
  validationRules?: RequirementStatement[];
  implicitRequirements?: RequirementStatement[];
  assumptions?: RequirementAssumption[];
  risks?: RequirementRisk[];
  automationCandidates?: AutomationCandidate[];
  jiraContext?: JiraStoryContext;
}

export interface ModelValidation {
  valid: boolean;
  errors: string[];
}

const scenarioPrefixes: Record<ScenarioCategory, string> = {
  functional: "FS-",
  negative: "NS-",
  boundary: "BS-",
  risk: "RS-",
  validation: "VS-",
  authorization: "AUTH-",
  security: "SS-",
  integration: "INT-",
  regression: "GS-"
};

export function validateRequirementAnalysis(analysis: RequirementAnalysis): ModelValidation {
  const errors: string[] = [];
  const acceptanceCriteriaIds = new Set(analysis.acceptanceCriteria.map((criterion) => criterion.id));
  const scenarioIds = new Set<string>();
  const coveredCriteria = new Set<string>();

  if (!/^[A-Z][A-Z0-9]+-[1-9][0-9]*$/.test(analysis.story.key)) {
    errors.push(`Invalid Jira Story key: ${analysis.story.key}`);
  }
  if (analysis.acceptanceCriteria.length === 0) {
    errors.push("At least one Acceptance Criterion is required.");
  }
  if (!analysis.story.summary.trim()) {
    errors.push("Jira Story summary is required.");
  }
  if (!analysis.story.description.trim()) {
    errors.push("Jira Story description is required.");
  }
  if (acceptanceCriteriaIds.size !== analysis.acceptanceCriteria.length) {
    errors.push("Acceptance Criterion identifiers must be unique.");
  }
  for (const criterion of analysis.acceptanceCriteria) {
    if (!/^AC-[1-9][0-9]*$/.test(criterion.id)) {
      errors.push(`Invalid Acceptance Criterion identifier: ${criterion.id}`);
    }
    if (!criterion.description.trim()) {
      errors.push(`Acceptance Criterion ${criterion.id} description is required.`);
    }
  }
  if (analysis.scenarios.length === 0) {
    errors.push("At least one requirement scenario is required.");
  }

  for (const scenario of analysis.scenarios) {
    if (scenarioIds.has(scenario.id)) {
      errors.push(`Duplicate scenario identifier: ${scenario.id}`);
    }
    scenarioIds.add(scenario.id);
    if (!scenario.id.startsWith(scenarioPrefixes[scenario.category])) {
      errors.push(`Scenario ${scenario.id} does not match category ${scenario.category}.`);
    }
    if (scenario.steps.length === 0) {
      errors.push(`Scenario ${scenario.id} requires at least one step.`);
    }
    scenario.steps.forEach((step, index) => {
      if (step.sequence !== index + 1) {
        errors.push(`Scenario ${scenario.id} step sequence must be contiguous from 1.`);
      }
    });
    if (scenario.acceptanceCriteriaIds.length === 0) {
      errors.push(`Scenario ${scenario.id} must reference an Acceptance Criterion.`);
    }
    for (const criterionId of scenario.acceptanceCriteriaIds) {
      if (!acceptanceCriteriaIds.has(criterionId)) {
        errors.push(`Scenario ${scenario.id} references unknown criterion ${criterionId}.`);
      } else {
        coveredCriteria.add(criterionId);
      }
    }
  }

  for (const criterionId of acceptanceCriteriaIds) {
    if (!coveredCriteria.has(criterionId)) {
      errors.push(`Acceptance Criterion ${criterionId} has no scenario coverage.`);
    }
  }

  for (const [label, requirements, prefix] of [
    ["Functional Requirement", analysis.functionalRequirements ?? [], "FR-"],
    ["Non-Functional Requirement", analysis.nonFunctionalRequirements ?? [], "NFR-"],
    ["Business Rule", analysis.businessRules ?? [], "BR-"],
    ["Validation Rule", analysis.validationRules ?? [], "VR-"],
    ["Implicit Requirement", analysis.implicitRequirements ?? [], "IR-"]
  ] as const) {
    const identifiers = new Set<string>();
    for (const requirement of requirements) {
      if (!new RegExp(`^${prefix}[1-9][0-9]*$`).test(requirement.id)) {
        errors.push(`Invalid ${label} identifier: ${requirement.id}`);
      }
      if (identifiers.has(requirement.id)) {
        errors.push(`${label} identifiers must be unique: ${requirement.id}`);
      }
      identifiers.add(requirement.id);
      if (!requirement.description.trim()) {
        errors.push(`${label} ${requirement.id} description is required.`);
      }
      for (const criterionId of requirement.acceptanceCriteriaIds) {
        if (!acceptanceCriteriaIds.has(criterionId)) {
          errors.push(`${label} ${requirement.id} references unknown criterion ${criterionId}.`);
        }
      }
    }
  }

  const assumptionIds = new Set<string>();
  for (const assumption of analysis.assumptions ?? []) {
    if (!/^ASM-[1-9][0-9]*$/.test(assumption.id)) {
      errors.push(`Invalid Assumption identifier: ${assumption.id}`);
    }
    if (assumptionIds.has(assumption.id)) errors.push(`Assumption identifiers must be unique: ${assumption.id}`);
    assumptionIds.add(assumption.id);
    if (!assumption.description.trim() || !assumption.rationale.trim()) {
      errors.push(`Assumption ${assumption.id} requires a description and rationale.`);
    }
  }

  const riskIds = new Set<string>();
  for (const risk of analysis.risks ?? []) {
    if (!/^RISK-[1-9][0-9]*$/.test(risk.id)) errors.push(`Invalid Risk identifier: ${risk.id}`);
    if (riskIds.has(risk.id)) errors.push(`Risk identifiers must be unique: ${risk.id}`);
    riskIds.add(risk.id);
    if (!risk.description.trim() || !risk.rationale.trim()) {
      errors.push(`Risk ${risk.id} requires a description and rationale.`);
    }
    for (const criterionId of risk.acceptanceCriteriaIds) {
      if (!acceptanceCriteriaIds.has(criterionId)) {
        errors.push(`Risk ${risk.id} references unknown criterion ${criterionId}.`);
      }
    }
  }

  const automationCandidateIds = new Set<string>();
  for (const candidate of analysis.automationCandidates ?? []) {
    if (!/^AUT-CAND-[1-9][0-9]*$/.test(candidate.id)) {
      errors.push(`Invalid Automation Candidate identifier: ${candidate.id}`);
    }
    if (automationCandidateIds.has(candidate.id)) {
      errors.push(`Automation Candidate identifiers must be unique: ${candidate.id}`);
    }
    automationCandidateIds.add(candidate.id);
    if (!scenarioIds.has(candidate.scenarioId)) {
      errors.push(`Automation Candidate ${candidate.id} references unknown scenario ${candidate.scenarioId}.`);
    }
    if (!candidate.rationale.trim()) {
      errors.push(`Automation Candidate ${candidate.id} rationale is required.`);
    }
    for (const criterionId of candidate.acceptanceCriteriaIds) {
      if (!acceptanceCriteriaIds.has(criterionId)) {
        errors.push(`Automation Candidate ${candidate.id} references unknown criterion ${criterionId}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
