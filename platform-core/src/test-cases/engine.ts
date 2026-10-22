import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { validateRequirementAnalysis, type RequirementAnalysis } from "../models/requirements.js";
import {
  validateTestCases,
  type RequirementCodeMapping,
  type StandardTestCase
} from "../models/test-cases.js";
import { writeJsonArtifact } from "../reporting/generator.js";
import type { UnifiedEvidenceModel } from "../evidence/intelligence.js";
import type { TestReuseAnalysis } from "./reuse.js";
import type { TestDataIntelligenceModel } from "../test-data/intelligence.js";

export function validateRequirementCodeMappings(
  analysis: RequirementAnalysis,
  codeMappings: RequirementCodeMapping[]
): string[] {
  const analysisValidation = validateRequirementAnalysis(analysis);
  const criterionIds = new Set(analysis.acceptanceCriteria.map((criterion) => criterion.id));
  const mappingIds = new Set<string>();
  const mappedCriteria = new Set<string>();
  const errors = [...analysisValidation.errors];

  for (const mapping of codeMappings) {
    if (!/^RCM-[1-9][0-9]*$/.test(mapping.id)) errors.push(`Invalid requirement-to-code mapping identifier: ${mapping.id}.`);
    if (mappingIds.has(mapping.id)) errors.push(`Duplicate requirement-to-code mapping identifier: ${mapping.id}.`);
    mappingIds.add(mapping.id);
    if (mapping.storyKey !== analysis.story.key) {
      errors.push(`Code mapping story ${mapping.storyKey} does not match ${analysis.story.key}.`);
    }
    if (!criterionIds.has(mapping.acceptanceCriteriaId)) {
      errors.push(`Code mapping references unknown Acceptance Criterion ${mapping.acceptanceCriteriaId}.`);
    }
    if (![mapping.repository, mapping.branch, mapping.commit, mapping.filePath, mapping.changeSummary].every((value) => value.trim())) {
      errors.push(`Code mapping ${mapping.id} is missing source evidence.`);
    }
    if (!mapping.changeAreas.length) errors.push(`Code mapping ${mapping.id} requires at least one change area.`);
    mappedCriteria.add(mapping.acceptanceCriteriaId);
  }

  for (const criterionId of criterionIds) {
    if (!mappedCriteria.has(criterionId)) {
      errors.push(`Acceptance Criterion ${criterionId} has no implementation code mapping.`);
    }
  }
  return errors;
}

export async function writeRequirementCodeMappings(
  analysis: RequirementAnalysis,
  codeMappings: RequirementCodeMapping[],
  outputDirectory: string
): Promise<void> {
  const errors = validateRequirementCodeMappings(analysis, codeMappings);
  if (errors.length > 0) {
    throw new Error(`Cannot write invalid requirement-to-code mappings: ${errors.join(" ")}`);
  }
  await writeJsonArtifact(codeMappings, outputDirectory, "requirement-code-mapping.json");
}

export function generateTestCases(
  analysis: RequirementAnalysis,
  codeMappings: RequirementCodeMapping[],
  evidenceModel?: UnifiedEvidenceModel,
  reuseAnalysis?: TestReuseAnalysis,
  testDataModel?: TestDataIntelligenceModel
): StandardTestCase[] {
  const requirementValidation = validateRequirementAnalysis(analysis);
  if (!requirementValidation.valid) {
    throw new Error(`Cannot generate test cases from invalid requirement analysis: ${requirementValidation.errors.join(" ")}`);
  }
  const mappingsByCriterion = new Map<string, RequirementCodeMapping[]>();
  const invalidMappings = validateRequirementCodeMappings(analysis, codeMappings);

  for (const mapping of codeMappings) {
    const entries = mappingsByCriterion.get(mapping.acceptanceCriteriaId) ?? [];
    entries.push(mapping);
    mappingsByCriterion.set(mapping.acceptanceCriteriaId, entries);
  }

  if (invalidMappings.length > 0) {
    throw new Error(`Cannot generate test cases without valid requirement-to-code mapping: ${invalidMappings.join(" ")}`);
  }
  if (evidenceModel && evidenceModel.storyKey !== analysis.story.key) {
    throw new Error(`Evidence model story ${evidenceModel.storyKey} does not match ${analysis.story.key}.`);
  }
  if (reuseAnalysis && reuseAnalysis.storyKey !== analysis.story.key) {
    throw new Error(`Test reuse analysis story ${reuseAnalysis.storyKey} does not match ${analysis.story.key}.`);
  }
  if (testDataModel && testDataModel.storyKey !== analysis.story.key) {
    throw new Error(`Test data model story ${testDataModel.storyKey} does not match ${analysis.story.key}.`);
  }
  if (evidenceModel) {
    const tracedCriteria = new Set(evidenceModel.traceability.map((row) => row.acceptanceCriteriaId));
    const scoredCriteria = new Set(evidenceModel.confidenceScores.map((score) => score.acceptanceCriteriaId));
    const missingCriteria = analysis.acceptanceCriteria
      .filter((criterion) => !tracedCriteria.has(criterion.id) || !scoredCriteria.has(criterion.id))
      .map((criterion) => criterion.id);
    if (missingCriteria.length > 0) {
      throw new Error(`Evidence model is missing traceability or confidence for: ${missingCriteria.join(", ")}.`);
    }
  }

  const reusableScenarioIds = new Set(reuseAnalysis?.reusableScenarioIds ?? []);
  const scenariosToGenerate = analysis.scenarios.filter((scenario) => !reusableScenarioIds.has(scenario.id));
  const testCases = scenariosToGenerate.map((scenario, index): StandardTestCase => ({
    id: `TC-${index + 1}`,
    version: 1,
    title: scenario.title,
    priority: scenario.priority,
    scenarioType: scenario.category,
    preconditions: [...scenario.preconditions],
    steps: scenario.steps.map((step) => ({ ...step })),
    expectedResult: scenario.expectedResult,
    traceability: {
      storyKey: analysis.story.key,
      acceptanceCriteriaIds: [...scenario.acceptanceCriteriaIds],
      scenarioIds: [scenario.id],
      ...(evidenceModel ? {
        evidenceIds: [...new Set(evidenceModel.traceability
          .filter((row) => scenario.acceptanceCriteriaIds.includes(row.acceptanceCriteriaId))
          .flatMap((row) => row.evidenceIds))],
        apiOperationIds: [...new Set(evidenceModel.traceability
          .filter((row) => scenario.acceptanceCriteriaIds.includes(row.acceptanceCriteriaId))
          .flatMap((row) => row.apiOperationIds))],
        historicalIssueKeys: [...new Set(evidenceModel.traceability
          .filter((row) => scenario.acceptanceCriteriaIds.includes(row.acceptanceCriteriaId))
          .flatMap((row) => row.historicalIssueKeys))],
        adrIds: [...new Set(evidenceModel.traceability
          .filter((row) => scenario.acceptanceCriteriaIds.includes(row.acceptanceCriteriaId))
          .flatMap((row) => row.adrIds))],
        evidenceConfidence: Math.min(...evidenceModel.confidenceScores
          .filter((score) => scenario.acceptanceCriteriaIds.includes(score.acceptanceCriteriaId))
          .map((score) => score.score))
      } : {}),
      ...(testDataModel ? {
        testDataSetIds: testDataModel.automationDataSets
          .filter((dataSet) => scenario.acceptanceCriteriaIds.some((id) => dataSet.acceptanceCriteriaIds.includes(id)))
          .map((dataSet) => dataSet.id)
      } : {}),
      codeReferences: scenario.acceptanceCriteriaIds.flatMap((criterionId) =>
        (mappingsByCriterion.get(criterionId) ?? []).map((mapping) => ({
          mappingId: mapping.id,
          acceptanceCriteriaId: mapping.acceptanceCriteriaId,
          changeType: mapping.changeType,
          changeAreas: [...mapping.changeAreas],
          repository: mapping.repository,
          branch: mapping.branch,
          ...(mapping.pullRequest ? { pullRequest: mapping.pullRequest } : {}),
          commit: mapping.commit,
          filePath: mapping.filePath,
          changeSummary: mapping.changeSummary
        }))
      )
    },
    status: "draft"
  }));

  const errors = validateTestCases(testCases);
  if (errors.length > 0) {
    throw new Error(`Generated test cases are invalid: ${errors.join(" ")}`);
  }
  return testCases;
}

export async function writeTestCases(testCases: StandardTestCase[], outputPath: string): Promise<void> {
  const errors = validateTestCases(testCases);
  if (errors.length > 0) {
    throw new Error(`Cannot write invalid test cases: ${errors.join(" ")}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(testCases, null, 2), "utf8");
}