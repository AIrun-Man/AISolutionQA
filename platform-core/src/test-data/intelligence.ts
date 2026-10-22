import type { ApiContractOperation } from "../api/contracts.js";
import type { ApiRequirementMapping } from "../api/intelligence.js";
import type { ApplicationDiscoveryIntelligence } from "../models/discovery.js";
import type { RequirementAnalysis } from "../models/requirements.js";
import { validateRequirementAnalysis } from "../models/requirements.js";

export interface DatabaseDataDependency {
  id: string;
  name: string;
  acceptanceCriteriaIds: string[];
  fields: Array<{ name: string; dataType: string; required: boolean; sensitive?: boolean }>;
  setupStrategy: string;
  cleanupStrategy: string;
}

export interface ReusableDataSource {
  id: string;
  path: string;
  fieldNames: string[];
  safeForReuse: boolean;
}

export type TestDataSource = "application" | "api-contract" | "database";
export type TestDataValueSource = "reusable" | "synthetic" | "environment-reference" | "unresolved";

export interface TestDataRequirement {
  id: string;
  acceptanceCriteriaId: string;
  fieldName: string;
  dataType: string;
  mandatory: boolean;
  sensitive: boolean;
  sources: TestDataSource[];
  sourceReferences: string[];
}

export interface AutomationDataValue {
  fieldName: string;
  source: TestDataValueSource;
  synthetic: boolean;
  sensitive: boolean;
  value?: string | number | boolean;
  reference?: string;
}

export interface AutomationDataSet {
  id: string;
  acceptanceCriteriaIds: string[];
  values: AutomationDataValue[];
  unresolvedMandatoryFields: string[];
  setupStrategies: string[];
  cleanupStrategies: string[];
}

export interface TestDataIntelligenceInput {
  requirementAnalysis: RequirementAnalysis;
  applicationDiscovery?: ApplicationDiscoveryIntelligence;
  apiOperations?: ApiContractOperation[];
  apiMappings?: ApiRequirementMapping[];
  databaseDependencies?: DatabaseDataDependency[];
  reusableDataSources?: ReusableDataSource[];
  allowSyntheticData: boolean;
}

export interface TestDataIntelligenceModel {
  schemaVersion: "1.0.0";
  storyKey: string;
  requirements: TestDataRequirement[];
  requirementsMatrix: Array<{
    acceptanceCriteriaId: string;
    mandatoryFieldIds: string[];
    reusableFieldIds: string[];
    unresolvedFieldIds: string[];
  }>;
  automationDataSets: AutomationDataSet[];
  dataSetupStrategies: Array<{ acceptanceCriteriaId: string; strategy: string; sourceId: string }>;
  dataCleanupStrategies: Array<{ acceptanceCriteriaId: string; strategy: string; sourceId: string }>;
}

interface DiscoveredFieldReference {
  name: string;
  dataType: string;
  mandatory: boolean;
  sensitive: boolean;
  acceptanceCriteriaIds: string[];
  source: TestDataSource;
  sourceReference: string;
}

const sensitiveFieldPattern = /password|secret|token|credential|private.?key|ssn|social.?security|payment.?card/i;

function requirementCriteria(analysis: RequirementAnalysis, requirementId: string): string[] {
  const statements = [
    ...(analysis.functionalRequirements ?? []),
    ...(analysis.nonFunctionalRequirements ?? []),
    ...(analysis.businessRules ?? []),
    ...(analysis.validationRules ?? []),
    ...(analysis.implicitRequirements ?? []),
    ...(analysis.risks ?? [])
  ];
  return statements.find((statement) => statement.id === requirementId)?.acceptanceCriteriaIds ?? [];
}

function syntheticValue(name: string, dataType: string): string | number | boolean | undefined {
  if (sensitiveFieldPattern.test(name) || /password|file|binary/i.test(dataType)) return undefined;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "field";
  if (/email/i.test(name) || /email/i.test(dataType)) return `qa.synthetic+${slug}@example.test`;
  if (/boolean|checkbox/i.test(dataType)) return false;
  if (/integer|number|decimal|numeric/i.test(dataType)) return 1001;
  if (/date|datetime/i.test(dataType)) return "2026-01-15";
  if (/string|text|select|enum/i.test(dataType)) return `Synthetic-${slug}`;
  return undefined;
}

function envReference(name: string): string {
  return `TEST_DATA_${name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`;
}

export function buildTestDataIntelligence(input: TestDataIntelligenceInput): TestDataIntelligenceModel {
  const validation = validateRequirementAnalysis(input.requirementAnalysis);
  if (!validation.valid) throw new Error(`Cannot build test data intelligence from invalid requirements: ${validation.errors.join(" ")}`);
  const criteriaIds = new Set(input.requirementAnalysis.acceptanceCriteria.map((criterion) => criterion.id));
  const fields: DiscoveredFieldReference[] = [];
  const addField = (field: DiscoveredFieldReference): void => {
    const validCriteria = field.acceptanceCriteriaIds.filter((id) => criteriaIds.has(id));
    for (const acceptanceCriteriaId of validCriteria) fields.push({ ...field, acceptanceCriteriaIds: [acceptanceCriteriaId] });
  };

  for (const journey of input.applicationDiscovery?.navigationModel.userJourneys ?? []) {
    const acceptanceCriteriaIds = journey.requirementIds.flatMap((id) => requirementCriteria(input.requirementAnalysis, id));
    const pages = input.applicationDiscovery?.uiDiscoveryModel.pages.filter((page) => journey.pageIds.includes(page.id)) ?? [];
    for (const page of pages) {
      for (const form of page.forms) {
        for (const field of form.fields) addField({
          name: field.name,
          dataType: field.fieldType,
          mandatory: field.required,
          sensitive: sensitiveFieldPattern.test(field.name) || field.fieldType === "password",
          acceptanceCriteriaIds,
          source: "application",
          sourceReference: `${page.route}#${form.id}/${field.id}`
        });
      }
    }
  }

  const operationsById = new Map((input.apiOperations ?? []).map((operation) => [operation.operationId, operation]));
  for (const mapping of input.apiMappings ?? []) {
    const operation = operationsById.get(mapping.operationId);
    if (!operation?.requestSchema) continue;
    for (const fieldName of operation.requestSchema.requiredFields) addField({
      name: fieldName,
      dataType: operation.requestSchema.properties[fieldName] ?? operation.requestSchema.type ?? "unknown",
      mandatory: true,
      sensitive: sensitiveFieldPattern.test(fieldName),
      acceptanceCriteriaIds: mapping.acceptanceCriteriaIds,
      source: "api-contract",
      sourceReference: `${operation.operationId}:${operation.requestSchema.name}`
    });
  }

  for (const dependency of input.databaseDependencies ?? []) {
    const unknownCriteria = dependency.acceptanceCriteriaIds.filter((id) => !criteriaIds.has(id));
    if (unknownCriteria.length > 0) throw new Error(`Database dependency ${dependency.id} references unknown Acceptance Criteria: ${unknownCriteria.join(", ")}.`);
    for (const field of dependency.fields) addField({
      name: field.name,
      dataType: field.dataType,
      mandatory: field.required,
      sensitive: field.sensitive === true || sensitiveFieldPattern.test(field.name),
      acceptanceCriteriaIds: dependency.acceptanceCriteriaIds,
      source: "database",
      sourceReference: `${dependency.name}:${dependency.id}`
    });
  }

  const requirementsByKey = new Map<string, TestDataRequirement>();
  for (const field of fields) {
    const key = `${field.acceptanceCriteriaIds[0]}:${field.name.toLowerCase()}`;
    const existing = requirementsByKey.get(key);
    if (existing) {
      if (!existing.sources.includes(field.source)) existing.sources.push(field.source);
      if (!existing.sourceReferences.includes(field.sourceReference)) existing.sourceReferences.push(field.sourceReference);
      existing.mandatory ||= field.mandatory;
      existing.sensitive ||= field.sensitive;
      continue;
    }
    requirementsByKey.set(key, {
      id: `DATA-${requirementsByKey.size + 1}`,
      acceptanceCriteriaId: field.acceptanceCriteriaIds[0]!,
      fieldName: field.name,
      dataType: field.dataType,
      mandatory: field.mandatory,
      sensitive: field.sensitive,
      sources: [field.source],
      sourceReferences: [field.sourceReference]
    });
  }

  const requirements = [...requirementsByKey.values()];
  const automationDataSets = input.requirementAnalysis.scenarios.map((scenario, index): AutomationDataSet => {
    const scenarioRequirements = requirements.filter((requirement) => scenario.acceptanceCriteriaIds.includes(requirement.acceptanceCriteriaId));
    const values = scenarioRequirements.map((requirement): AutomationDataValue => {
      const reusable = input.reusableDataSources?.find((source) =>
        source.safeForReuse && source.fieldNames.some((name) => name.toLowerCase() === requirement.fieldName.toLowerCase())
      );
      if (reusable) return { fieldName: requirement.fieldName, source: "reusable", synthetic: false, sensitive: requirement.sensitive, reference: reusable.path };
      const generated = input.allowSyntheticData && !requirement.sensitive
        ? syntheticValue(requirement.fieldName, requirement.dataType)
        : undefined;
      if (generated !== undefined) return { fieldName: requirement.fieldName, source: "synthetic", synthetic: true, sensitive: false, value: generated };
      if (requirement.sensitive) return { fieldName: requirement.fieldName, source: "environment-reference", synthetic: false, sensitive: true, reference: envReference(requirement.fieldName) };
      return { fieldName: requirement.fieldName, source: "unresolved", synthetic: false, sensitive: false };
    });
    const unresolvedMandatoryFields = scenarioRequirements.filter((requirement) => requirement.mandatory &&
      values.find((value) => value.fieldName === requirement.fieldName)?.source === "unresolved"
    ).map((requirement) => requirement.fieldName);
    const dependencies = (input.databaseDependencies ?? []).filter((dependency) =>
      dependency.acceptanceCriteriaIds.some((id) => scenario.acceptanceCriteriaIds.includes(id))
    );
    return {
      id: `DATASET-${index + 1}`,
      acceptanceCriteriaIds: [...scenario.acceptanceCriteriaIds],
      values,
      unresolvedMandatoryFields,
      setupStrategies: dependencies.map((dependency) => dependency.setupStrategy),
      cleanupStrategies: dependencies.map((dependency) => dependency.cleanupStrategy)
    };
  });

  const requirementsMatrix = input.requirementAnalysis.acceptanceCriteria.map((criterion) => {
    const criterionRequirements = requirements.filter((requirement) => requirement.acceptanceCriteriaId === criterion.id);
    const dataSetValues = automationDataSets.filter((set) => set.acceptanceCriteriaIds.includes(criterion.id)).flatMap((set) => set.values);
    return {
      acceptanceCriteriaId: criterion.id,
      mandatoryFieldIds: criterionRequirements.filter((requirement) => requirement.mandatory).map((requirement) => requirement.id),
      reusableFieldIds: criterionRequirements.filter((requirement) => dataSetValues.some((value) => value.fieldName === requirement.fieldName && value.source === "reusable")).map((requirement) => requirement.id),
      unresolvedFieldIds: criterionRequirements.filter((requirement) => dataSetValues.some((value) => value.fieldName === requirement.fieldName && value.source === "unresolved")).map((requirement) => requirement.id)
    };
  });
  const dataSetupStrategies = (input.databaseDependencies ?? []).flatMap((dependency) => dependency.acceptanceCriteriaIds.map((acceptanceCriteriaId) => ({ acceptanceCriteriaId, strategy: dependency.setupStrategy, sourceId: dependency.id })));
  const dataCleanupStrategies = (input.databaseDependencies ?? []).flatMap((dependency) => dependency.acceptanceCriteriaIds.map((acceptanceCriteriaId) => ({ acceptanceCriteriaId, strategy: dependency.cleanupStrategy, sourceId: dependency.id })));
  return { schemaVersion: "1.0.0", storyKey: input.requirementAnalysis.story.key, requirements, requirementsMatrix, automationDataSets, dataSetupStrategies, dataCleanupStrategies };
}