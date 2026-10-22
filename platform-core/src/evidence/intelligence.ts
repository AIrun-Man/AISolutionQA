import type { ApiContractOperation } from "../api/contracts.js";
import type { ApiRequirementMapping } from "../api/intelligence.js";
import type { RequirementCodeFinding, RequirementCodeValidationReport } from "../requirements/engine.js";
import type { JiraRelatedIssue, RequirementAnalysis, RequirementRisk } from "../models/requirements.js";
import type { RequirementCodeMapping, StandardTestCase } from "../models/test-cases.js";
import type { ApplicationDiscoveryIntelligence } from "../models/discovery.js";
import type { EnvironmentIntelligenceModel } from "../environments/intelligence.js";
import type { TestDataIntelligenceModel } from "../test-data/intelligence.js";
import type { TestReuseAnalysis, XrayRepositoryAnalysis } from "../test-cases/reuse.js";
import type { ImplementationReconstructionModel, ImplementationSourceModel, ImplementationTrustReport } from "../implementation/lineage.js";

export interface HistoricalStoryEvidence extends JiraRelatedIssue {
  acceptanceCriteriaIds: string[];
  implementationReferences: string[];
}

export interface AdrEvidence {
  id: string;
  title: string;
  filePath: string;
  decision: string;
  acceptanceCriteriaIds: string[];
}

export interface FeatureBranchEvidence {
  repository: string;
  branch: string;
  pullRequest?: string;
  commitIds: string[];
  storyReference: string;
}

export interface ScriptEvidence {
  id: string;
  testCaseId: string;
  path: string;
  strategy: "ui" | "api";
}

export type EvidenceSourceType = "jira-requirement" | "historical-jira" | "implementation" | "implementation-source" | "implementation-reconstruction" | "implementation-trust" | "api-contract" | "adr" | "application-discovery" | "test-reuse" | "environment" | "test-data" | "xray-repository" | "xray-test" | "automation";

export interface EvidenceReference {
  id: string;
  sourceType: EvidenceSourceType;
  reference: string;
  description: string;
}

export interface RequirementEvidenceTrace {
  acceptanceCriteriaId: string;
  evidenceIds: string[];
  implementationMappingIds: string[];
  apiOperationIds: string[];
  historicalIssueKeys: string[];
  adrIds: string[];
  testCaseIds: string[];
  automationIds: string[];
}

export interface BehaviorFinding {
  acceptanceCriteriaId: string;
  description: string;
  evidenceIds: string[];
  reason: string;
}

export interface EvidenceConfidenceScore {
  acceptanceCriteriaId: string;
  score: number;
  sourceScores: Partial<Record<EvidenceSourceType, number>>;
  evidenceIds: string[];
}

export interface UnifiedEvidenceModel {
  schemaVersion: "1.0.0";
  storyKey: string;
  sourcePriority: EvidenceSourceType[];
  evidence: EvidenceReference[];
  featureBranches: FeatureBranchEvidence[];
  implementationSourceModel?: ImplementationSourceModel;
  implementationReconstructionModel?: ImplementationReconstructionModel;
  implementationTrustReport?: ImplementationTrustReport;
  applicationDiscovery?: ApplicationDiscoveryIntelligence;
  testReuseAnalysis?: TestReuseAnalysis;
  environmentModel?: EnvironmentIntelligenceModel;
  testDataModel?: TestDataIntelligenceModel;
  xrayRepositoryAnalysis?: XrayRepositoryAnalysis;
  implementationModel: {
    addedFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
    businessLogicFiles: string[];
    serviceFiles: string[];
    apiFiles: string[];
    validationFiles: string[];
    databaseFiles: string[];
    uiFiles: string[];
    uiComponentFiles: string[];
    errorHandlingFiles: string[];
  };
  traceability: RequirementEvidenceTrace[];
  confirmedBehaviors: BehaviorFinding[];
  missingBehaviors: BehaviorFinding[];
  assumptions: NonNullable<RequirementAnalysis["assumptions"]>;
  risks: RequirementRisk[];
  confidenceScores: EvidenceConfidenceScore[];
}

export interface UnifiedEvidenceInput {
  requirementAnalysis: RequirementAnalysis;
  implementationMappings: RequirementCodeMapping[];
  implementationFindings: RequirementCodeValidationReport;
  confirmedImplementationMappingIds: string[];
  featureBranches?: FeatureBranchEvidence[];
  implementationSourceModel?: ImplementationSourceModel;
  implementationReconstructionModel?: ImplementationReconstructionModel;
  implementationTrustReport?: ImplementationTrustReport;
  apiOperations?: ApiContractOperation[];
  apiMappings?: ApiRequirementMapping[];
  historicalStories?: HistoricalStoryEvidence[];
  adrEvidence?: AdrEvidence[];
  applicationDiscovery?: ApplicationDiscoveryIntelligence;
  testReuseAnalysis?: TestReuseAnalysis;
  environmentModel?: EnvironmentIntelligenceModel;
  testDataModel?: TestDataIntelligenceModel;
  xrayRepositoryAnalysis?: XrayRepositoryAnalysis;
  testCases?: StandardTestCase[];
  scripts?: ScriptEvidence[];
}

const sourcePriority: EvidenceSourceType[] = [
  "jira-requirement",
  "implementation",
  "implementation-source",
  "implementation-reconstruction",
  "implementation-trust",
  "api-contract",
  "adr",
  "application-discovery",
  "historical-jira",
  "test-reuse",
  "environment",
  "test-data",
  "xray-repository",
  "xray-test",
  "automation"
];

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function validateEvidenceInput(input: UnifiedEvidenceInput): void {
  const criteriaIds = new Set(input.requirementAnalysis.acceptanceCriteria.map((criterion) => criterion.id));
  if (input.implementationFindings.storyKey !== input.requirementAnalysis.story.key) {
    throw new Error("Implementation findings must match the analyzed Jira story.");
  }
  if (input.implementationSourceModel && input.implementationSourceModel.storyKey !== input.requirementAnalysis.story.key) {
    throw new Error("Implementation source model must belong to the analyzed Jira story.");
  }
  if (input.implementationReconstructionModel && (
    input.implementationReconstructionModel.storyKey !== input.requirementAnalysis.story.key
    || input.implementationReconstructionModel.repository !== input.implementationSourceModel?.repository
    || input.implementationSourceModel?.reconstructionRequired !== true
    || input.implementationTrustReport?.decision !== "trusted"
    || input.implementationTrustReport.repository !== input.implementationSourceModel.repository
  )) {
    throw new Error("Implementation reconstruction requires matching source evidence and a trusted implementation report.");
  }
  if (input.implementationTrustReport && input.implementationTrustReport.storyKey !== input.requirementAnalysis.story.key) {
    throw new Error("Implementation trust report must belong to the analyzed Jira story.");
  }
  for (const mapping of input.implementationMappings) {
    if (mapping.storyKey !== input.requirementAnalysis.story.key || !criteriaIds.has(mapping.acceptanceCriteriaId)) {
      throw new Error(`Implementation mapping ${mapping.id} does not belong to this story and its acceptance criteria.`);
    }
  }
  const mappingIds = new Set(input.implementationMappings.map((mapping) => mapping.id));
  if (input.confirmedImplementationMappingIds.some((id) => !mappingIds.has(id))) {
    throw new Error("Semantic implementation confirmations must reference supplied requirement-code mappings.");
  }
  for (const mapping of input.apiMappings ?? []) {
    if (mapping.acceptanceCriteriaIds.some((id) => !criteriaIds.has(id))) {
      throw new Error(`API mapping ${mapping.operationId} references an unknown acceptance criterion.`);
    }
  }
  for (const entry of [...(input.historicalStories ?? []), ...(input.adrEvidence ?? [])]) {
    if (entry.acceptanceCriteriaIds.some((id) => !criteriaIds.has(id))) {
      throw new Error("Historical Jira and ADR evidence must reference acceptance criteria from this story.");
    }
  }
  for (const model of [input.testReuseAnalysis, input.testDataModel, input.xrayRepositoryAnalysis]) {
    if (model && model.storyKey !== input.requirementAnalysis.story.key) throw new Error("Evidence intelligence input belongs to a different Jira story.");
  }
  if (input.applicationDiscovery && input.applicationDiscovery.requirementIds.some((id) => ![
    ...(input.requirementAnalysis.functionalRequirements ?? []),
    ...(input.requirementAnalysis.nonFunctionalRequirements ?? []),
    ...(input.requirementAnalysis.businessRules ?? []),
    ...(input.requirementAnalysis.validationRules ?? []),
    ...(input.requirementAnalysis.implicitRequirements ?? [])
  ].some((requirement) => requirement.id === id))) {
    throw new Error("Application discovery references a requirement that is not in the analyzed story.");
  }
  if (input.testDataModel?.requirements.some((requirement) => !criteriaIds.has(requirement.acceptanceCriteriaId))) {
    throw new Error("Test data evidence references an acceptance criterion that is not in the analyzed story.");
  }
  if (input.environmentModel?.environments.some((environment) =>
    (environment.acceptanceCriteriaIds ?? []).some((id) => !criteriaIds.has(id))
  )) {
    throw new Error("Environment evidence references an acceptance criterion that is not in the analyzed story.");
  }
  if (input.testReuseAnalysis?.scenarioFindings.some((finding) =>
    !input.requirementAnalysis.scenarios.some((scenario) => scenario.id === finding.scenarioId)
  )) {
    throw new Error("Test reuse evidence references a scenario that is not in the analyzed story.");
  }
  if (input.xrayRepositoryAnalysis?.coverageDelta.some((row) => !criteriaIds.has(row.acceptanceCriteriaId))) {
    throw new Error("Xray repository evidence references an acceptance criterion that is not in the analyzed story.");
  }
}

function acceptanceCriteriaForRequirement(analysis: RequirementAnalysis, requirementId: string): string[] {
  return [
    ...(analysis.functionalRequirements ?? []),
    ...(analysis.nonFunctionalRequirements ?? []),
    ...(analysis.businessRules ?? []),
    ...(analysis.validationRules ?? []),
    ...(analysis.implicitRequirements ?? []),
    ...(analysis.risks ?? [])
  ].find((requirement) => requirement.id === requirementId)?.acceptanceCriteriaIds ?? [];
}

function findingForCriterion(
  criterionId: string,
  analysis: RequirementAnalysis,
  findings: RequirementCodeFinding[]
): RequirementCodeFinding[] {
  const requirementIds = [
    ...(analysis.functionalRequirements ?? []),
    ...(analysis.nonFunctionalRequirements ?? []),
    ...(analysis.businessRules ?? []),
    ...(analysis.validationRules ?? []),
    ...(analysis.implicitRequirements ?? []),
    ...(analysis.risks ?? [])
  ].filter((item) => item.acceptanceCriteriaIds.includes(criterionId)).map((item) => item.id);
  return findings.filter((finding) => finding.acceptanceCriteriaIds.includes(criterionId) || requirementIds.includes(finding.requirementId));
}

export function correlateEvidence(input: UnifiedEvidenceInput): UnifiedEvidenceModel {
  validateEvidenceInput(input);
  const { requirementAnalysis: analysis } = input;
  const evidence: EvidenceReference[] = [];
  const evidenceByCriterion = new Map<string, string[]>();
  const addEvidence = (criterionId: string, item: EvidenceReference): void => {
    evidence.push(item);
    const ids = evidenceByCriterion.get(criterionId) ?? [];
    ids.push(item.id);
    evidenceByCriterion.set(criterionId, ids);
  };

  for (const criterion of analysis.acceptanceCriteria) {
    addEvidence(criterion.id, {
      id: `JIRA-${criterion.id}`,
      sourceType: "jira-requirement",
      reference: `${analysis.jiraContext?.sourceUrl ?? analysis.story.key}#${criterion.id}`,
      description: criterion.description
    });
  }

  if (input.implementationSourceModel) {
    const source = input.implementationSourceModel;
    evidence.push({
      id: `IMPL-SOURCE-${source.storyKey}`,
      sourceType: "implementation-source",
      reference: `${source.repository}:${source.selectedSource ?? source.discoveryStatus}`,
      description: `Implementation source lineage; reconstruction required: ${source.reconstructionRequired ?? "unknown"}.`
    });
    for (const pullRequest of source.pullRequests) evidence.push({
      id: `IMPL-PR-${pullRequest.id}`,
      sourceType: "implementation-source",
      reference: pullRequest.url,
      description: `Story-associated pull request from ${pullRequest.sourceBranch} to ${pullRequest.targetBranch} (${pullRequest.state}).`
    });
    for (const commit of source.commits) evidence.push({
      id: `IMPL-COMMIT-${commit.sha}`,
      sourceType: "implementation-source",
      reference: `${commit.repository}@${commit.sha}`,
      description: commit.message
    });
  }
  if (input.implementationReconstructionModel) evidence.push({
    id: `IMPL-RECONSTRUCTION-${input.implementationReconstructionModel.storyKey}`,
    sourceType: "implementation-reconstruction",
    reference: `${input.implementationReconstructionModel.repository}@${input.implementationReconstructionModel.sourceShas.join(",")}`,
    description: `Implementation reconstruction is ${input.implementationReconstructionModel.status} with ${input.implementationReconstructionModel.changes.length} evidence-backed file changes.`
  });
  if (input.implementationTrustReport) evidence.push({
    id: `IMPL-TRUST-${input.implementationTrustReport.storyKey}`,
    sourceType: "implementation-trust",
    reference: `${input.implementationTrustReport.repository}:${input.implementationTrustReport.score}`,
    description: `Implementation Trust Score ${input.implementationTrustReport.score} (${input.implementationTrustReport.decision}).`
  });

  for (const mapping of input.implementationMappings) {
    addEvidence(mapping.acceptanceCriteriaId, {
      id: mapping.id,
      sourceType: "implementation",
      reference: `${mapping.repository}@${mapping.commit}:${mapping.filePath}`,
      description: mapping.changeSummary
    });
  }

  const operationById = new Map((input.apiOperations ?? []).map((operation) => [operation.operationId, operation]));
  for (const mapping of input.apiMappings ?? []) {
    const operation = operationById.get(mapping.operationId);
    if (!operation) continue;
    for (const criterionId of mapping.acceptanceCriteriaIds) {
      addEvidence(criterionId, {
        id: `API-${mapping.operationId}`,
        sourceType: "api-contract",
        reference: `${operation.method} ${operation.path} (${operation.sourceUrl})`,
        description: operation.summary
      });
    }
  }

  for (const story of input.historicalStories ?? []) {
    for (const criterionId of story.acceptanceCriteriaIds) {
      addEvidence(criterionId, {
        id: `HIST-${story.key}`,
        sourceType: "historical-jira",
        reference: story.url ?? story.key,
        description: `${story.summary} (${story.status}); ${story.implementationReferences.join(", ")}`
      });
    }
  }

  for (const adr of input.adrEvidence ?? []) {
    for (const criterionId of adr.acceptanceCriteriaIds) {
      addEvidence(criterionId, {
        id: adr.id,
        sourceType: "adr",
        reference: adr.filePath,
        description: `${adr.title}: ${adr.decision}`
      });
    }
  }

  for (const journey of input.applicationDiscovery?.navigationModel.userJourneys ?? []) {
    const criteriaIds = unique(journey.requirementIds.flatMap((id) => acceptanceCriteriaForRequirement(analysis, id)));
    for (const criterionId of criteriaIds) addEvidence(criterionId, {
      id: `APP-${journey.id}`,
      sourceType: "application-discovery",
      reference: journey.pageIds.join(", "),
      description: `Observed user journey ${journey.name}: ${journey.outcome}`
    });
  }

  for (const finding of input.testReuseAnalysis?.scenarioFindings ?? []) {
    const scenario = analysis.scenarios.find((item) => item.id === finding.scenarioId);
    if (!scenario) continue;
    for (const issueKey of finding.matchingTestIssueKeys) for (const criterionId of scenario.acceptanceCriteriaIds) addEvidence(criterionId, {
      id: `REUSE-${finding.scenarioId}-${issueKey}`,
      sourceType: "test-reuse",
      reference: issueKey,
      description: `${finding.decision} match in existing Xray test for scenario ${finding.scenarioId}.`
    });
  }

  for (const environment of input.environmentModel?.environments ?? []) {
    for (const criterionId of environment.acceptanceCriteriaIds ?? []) addEvidence(criterionId, {
      id: `ENV-${environment.name}`,
      sourceType: "environment",
      reference: environment.name,
      description: `Execution configuration available for ${environment.name}.`
    });
  }

  for (const requirement of input.testDataModel?.requirements ?? []) addEvidence(requirement.acceptanceCriteriaId, {
    id: requirement.id,
    sourceType: "test-data",
    reference: requirement.sourceReferences.join(", "),
    description: `${requirement.mandatory ? "Mandatory" : "Optional"} ${requirement.dataType} test data: ${requirement.fieldName}.`
  });

  for (const row of input.xrayRepositoryAnalysis?.coverageDelta ?? []) {
    for (const issueKey of row.activeTestIssueKeys) addEvidence(row.acceptanceCriteriaId, {
      id: `XRAY-${issueKey}`,
      sourceType: "xray-repository",
      reference: issueKey,
      description: `Existing Xray test currently covers ${row.acceptanceCriteriaId}.`
    });
  }

  for (const testCase of input.testCases ?? []) {
    for (const criterionId of testCase.traceability.acceptanceCriteriaIds) {
      addEvidence(criterionId, {
        id: testCase.id,
        sourceType: "xray-test",
        reference: testCase.id,
        description: testCase.title
      });
    }
  }

  const scriptsByTestCase = new Map((input.scripts ?? []).map((script) => [script.testCaseId, script]));
  for (const testCase of input.testCases ?? []) {
    const script = scriptsByTestCase.get(testCase.id);
    if (!script) continue;
    for (const criterionId of testCase.traceability.acceptanceCriteriaIds) {
      addEvidence(criterionId, {
        id: script.id,
        sourceType: "automation",
        reference: script.path,
        description: `${script.strategy.toUpperCase()} automation for ${testCase.id}`
      });
    }
  }

  const implementationFindings = input.implementationFindings.findings;
  const traceability = analysis.acceptanceCriteria.map((criterion): RequirementEvidenceTrace => {
    const testCaseIds = (input.testCases ?? []).filter((testCase) => testCase.traceability.acceptanceCriteriaIds.includes(criterion.id)).map((testCase) => testCase.id);
    const criteriaScripts = (input.scripts ?? []).filter((script) => testCaseIds.includes(script.testCaseId));
    return {
      acceptanceCriteriaId: criterion.id,
      evidenceIds: unique(evidenceByCriterion.get(criterion.id) ?? []),
      implementationMappingIds: input.implementationMappings.filter((mapping) => mapping.acceptanceCriteriaId === criterion.id).map((mapping) => mapping.id),
      apiOperationIds: unique((input.apiMappings ?? []).filter((mapping) => mapping.acceptanceCriteriaIds.includes(criterion.id) && operationById.has(mapping.operationId)).map((mapping) => mapping.operationId)),
      historicalIssueKeys: unique((input.historicalStories ?? []).filter((story) => story.acceptanceCriteriaIds.includes(criterion.id)).map((story) => story.key)),
      adrIds: unique((input.adrEvidence ?? []).filter((adr) => adr.acceptanceCriteriaIds.includes(criterion.id)).map((adr) => adr.id)),
      testCaseIds,
      automationIds: criteriaScripts.map((script) => script.id)
    };
  });

  const confirmedBehaviors: BehaviorFinding[] = [];
  const missingBehaviors: BehaviorFinding[] = [];
  const confidenceScores = analysis.acceptanceCriteria.map((criterion): EvidenceConfidenceScore => {
    const mappings = input.implementationMappings.filter((mapping) => mapping.acceptanceCriteriaId === criterion.id);
    const findings = findingForCriterion(criterion.id, analysis, implementationFindings);
    const mappingsConfirmed = mappings.length > 0 && mappings.every((mapping) => input.confirmedImplementationMappingIds.includes(mapping.id));
    const implementationConfidence = mappingsConfirmed && findings.length > 0
      ? Math.min(...findings.map((finding) => finding.confidence))
      : 0;
    const hasImplementation = mappingsConfirmed && findings.length > 0 && findings.every((finding) => finding.status === "implemented" && finding.confidence >= 0.75);
    const relatedApi = (input.apiMappings ?? []).some((mapping) => mapping.acceptanceCriteriaIds.includes(criterion.id) && operationById.has(mapping.operationId));
    const hasHistory = (input.historicalStories ?? []).some((story) => story.acceptanceCriteriaIds.includes(criterion.id));
    const hasAdr = (input.adrEvidence ?? []).some((adr) => adr.acceptanceCriteriaIds.includes(criterion.id));
    const appJourney = (input.applicationDiscovery?.navigationModel.userJourneys ?? []).some((journey) =>
      journey.requirementIds.some((id) => acceptanceCriteriaForRequirement(analysis, id).includes(criterion.id))
    );
    const reuseFinding = input.testReuseAnalysis?.scenarioFindings.find((finding) =>
      finding.acceptanceCriteriaIds.includes(criterion.id) && finding.decision === "reusable"
    );
    const environmentAvailable = (input.environmentModel?.environments ?? []).some((environment) => environment.acceptanceCriteriaIds?.includes(criterion.id));
    const testDataRequirements = input.testDataModel?.requirements.filter((requirement) => requirement.acceptanceCriteriaId === criterion.id) ?? [];
    const hasTestData = testDataRequirements.length > 0;
    const xrayCovered = input.xrayRepositoryAnalysis?.coverageDelta.some((row) => row.acceptanceCriteriaId === criterion.id && row.status === "covered") ?? false;
    const sourceScores: EvidenceConfidenceScore["sourceScores"] = {
      "jira-requirement": 100,
      implementation: Math.round(implementationConfidence * 100),
      ...(relatedApi ? { "api-contract": 100 } : {}),
      ...(hasHistory ? { "historical-jira": 75 } : {}),
      ...(hasAdr ? { adr: 60 } : {}),
      ...(appJourney ? { "application-discovery": 100 } : {}),
      ...(reuseFinding ? { "test-reuse": 100 } : {}),
      ...(environmentAvailable ? { environment: 100 } : {}),
      ...(hasTestData ? { "test-data": testDataRequirements.every((requirement) => requirement.mandatory) ? 90 : 70 } : {}),
      ...(xrayCovered ? { "xray-repository": 100 } : {})
    };
    const weights: Partial<Record<EvidenceSourceType, number>> = {
      "jira-requirement": 0.3,
      implementation: 0.5,
      "api-contract": 0.1,
      "historical-jira": 0.07,
      adr: 0.03,
      "application-discovery": 0.05,
      "test-reuse": 0.1,
      environment: 0.03,
      "test-data": 0.05,
      "xray-repository": 0.1
    };
    const applicable = Object.entries(sourceScores) as Array<[EvidenceSourceType, number]>;
    const weightTotal = applicable.reduce((total, [source]) => total + (weights[source] ?? 0), 0);
    const score = Math.round(applicable.reduce((total, [source, value]) => total + value * (weights[source] ?? 0), 0) / weightTotal);
    const evidenceIds = unique(evidenceByCriterion.get(criterion.id) ?? []);
    const reason = hasImplementation
      ? "Implementation mappings and code findings support the behavior."
      : mappings.length === 0
        ? "No implementation mapping was found for this acceptance criterion."
        : "Implementation evidence is present but does not independently confirm the behavior.";
    const behavior = { acceptanceCriteriaId: criterion.id, description: criterion.description, evidenceIds, reason };
    (hasImplementation ? confirmedBehaviors : missingBehaviors).push(behavior);
    return { acceptanceCriteriaId: criterion.id, score, sourceScores, evidenceIds };
  });

  const risks = [...(analysis.risks ?? [])];
  for (const behavior of missingBehaviors) {
    risks.push({
      id: `RISK-EVIDENCE-${behavior.acceptanceCriteriaId}`,
      description: `Behavior for ${behavior.acceptanceCriteriaId} is not confirmed by implementation evidence.`,
      rationale: behavior.reason,
      priority: "high",
      acceptanceCriteriaIds: [behavior.acceptanceCriteriaId]
    });
  }

  const mappings = input.implementationMappings;
  const reconstructedChanges = input.implementationReconstructionModel?.changes ?? [];
  const discoveredFiles = input.implementationSourceModel?.changedFiles ?? [];
  const sourceChanges = reconstructedChanges.length > 0 ? reconstructedChanges : discoveredFiles;
  const filesForArea = (area: RequirementCodeMapping["changeAreas"][number]): string[] => unique(mappings.filter((mapping) => mapping.changeAreas.includes(area)).map((mapping) => mapping.filePath));
  const filesForReconstructedArea = (area: string): string[] => reconstructedChanges.filter((change) => change.areas.includes(area as typeof change.areas[number])).map((change) => change.path);
  const filesForSourceArea = (area: string): string[] => sourceChanges.filter((change) => "areas" in change && change.areas.includes(area as typeof change.areas[number])).map((change) => change.path);
  const filesByChangeType = (changeType: "added" | "modified" | "deleted"): string[] => unique([
    ...(reconstructedChanges.length > 0
      ? reconstructedChanges.filter((change) => change.changeType === changeType).map((change) => change.path)
      : discoveredFiles.length > 0
        ? discoveredFiles.filter((change) => change.changeType === changeType).map((change) => change.path)
        : mappings.filter((mapping) => mapping.changeType === changeType).map((mapping) => mapping.filePath))
  ]);
  return {
    schemaVersion: "1.0.0",
    storyKey: analysis.story.key,
    sourcePriority,
    evidence,
    featureBranches: input.featureBranches ?? [],
    ...(input.implementationSourceModel ? { implementationSourceModel: input.implementationSourceModel } : {}),
    ...(input.implementationReconstructionModel ? { implementationReconstructionModel: input.implementationReconstructionModel } : {}),
    ...(input.implementationTrustReport ? { implementationTrustReport: input.implementationTrustReport } : {}),
    ...(input.applicationDiscovery ? { applicationDiscovery: input.applicationDiscovery } : {}),
    ...(input.testReuseAnalysis ? { testReuseAnalysis: input.testReuseAnalysis } : {}),
    ...(input.environmentModel ? { environmentModel: input.environmentModel } : {}),
    ...(input.testDataModel ? { testDataModel: input.testDataModel } : {}),
    ...(input.xrayRepositoryAnalysis ? { xrayRepositoryAnalysis: input.xrayRepositoryAnalysis } : {}),
    implementationModel: {
      addedFiles: filesByChangeType("added"),
      modifiedFiles: filesByChangeType("modified"),
      deletedFiles: filesByChangeType("deleted"),
      businessLogicFiles: unique([...filesForArea("business-logic"), ...filesForReconstructedArea("business-logic"), ...filesForSourceArea("business-logic")]),
      serviceFiles: filesForArea("service"),
      apiFiles: unique([...filesForArea("api"), ...filesForReconstructedArea("api"), ...filesForSourceArea("api")]),
      validationFiles: unique([...filesForArea("validation"), ...filesForReconstructedArea("validation"), ...filesForSourceArea("validation")]),
      databaseFiles: unique([...filesForArea("database"), ...filesForReconstructedArea("data-access"), ...filesForSourceArea("data-access")]),
      uiFiles: unique([...filesForArea("ui"), ...filesForReconstructedArea("ui-component"), ...filesForSourceArea("ui-component")]),
      uiComponentFiles: unique([...filesForArea("ui-component"), ...filesForReconstructedArea("ui-component"), ...filesForSourceArea("ui-component")]),
      errorHandlingFiles: unique([...filesForArea("error-handling"), ...filesForReconstructedArea("error-handling"), ...filesForSourceArea("error-handling")])
    },
    traceability,
    confirmedBehaviors,
    missingBehaviors,
    assumptions: [...(analysis.assumptions ?? [])],
    risks,
    confidenceScores
  };
}

export interface ReadinessDimensions {
  requirementConfidence: number;
  implementationConfidence: number;
  apiConfidence: number | null;
  xrayCoverageConfidence: number;
  automationConfidence: number;
}

export interface StoryReadinessReport {
  schemaVersion: "1.0.0";
  storyKey: string;
  assessedBeforeExecution: true;
  minimumOverallReadinessScore: number;
  ready: boolean;
  dimensions: ReadinessDimensions;
  overallReadinessScore: number;
  formula: string;
}

export function calculateStoryReadiness(storyKey: string, dimensions: ReadinessDimensions, minimumOverallReadinessScore = 80): StoryReadinessReport {
  if (!storyKey.trim()) throw new Error("Story readiness requires a Jira story key.");
  if (!Number.isFinite(minimumOverallReadinessScore) || minimumOverallReadinessScore < 0 || minimumOverallReadinessScore > 100) {
    throw new Error("Minimum overall readiness score must be between 0 and 100.");
  }
  for (const [name, score] of Object.entries(dimensions)) {
    if (score === null && name === "apiConfidence") continue;
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`Readiness dimension ${name} must be between 0 and 100.`);
    }
  }
  const scores = Object.values(dimensions).filter((score): score is number => score !== null);
  const overallReadinessScore = Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
  return {
    schemaVersion: "1.0.0",
    storyKey,
    assessedBeforeExecution: true,
    minimumOverallReadinessScore,
    ready: overallReadinessScore >= minimumOverallReadinessScore,
    dimensions,
    overallReadinessScore,
    formula: dimensions.apiConfidence === null
      ? "Arithmetic mean of applicable requirement, implementation, Xray coverage, and automation confidence percentages."
      : "Arithmetic mean of requirement, implementation, API, Xray coverage, and automation confidence percentages."
  };
}