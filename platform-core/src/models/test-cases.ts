import type { Priority, ScenarioCategory, ScenarioStep } from "./requirements.js";

export interface TraceabilityReference {
  storyKey: string;
  acceptanceCriteriaIds: string[];
  scenarioIds: string[];
  codeReferences: TestCaseCodeReference[];
  evidenceIds?: string[];
  apiOperationIds?: string[];
  historicalIssueKeys?: string[];
  adrIds?: string[];
  evidenceConfidence?: number;
  testDataSetIds?: string[];
}

export type CodeChangeType = "added" | "modified" | "deleted";
export type CodeChangeArea = "business-logic" | "service" | "api" | "validation" | "database" | "ui" | "ui-component" | "error-handling" | "other";

export interface TestCaseCodeReference {
  mappingId: string;
  acceptanceCriteriaId: string;
  changeType: CodeChangeType;
  changeAreas: CodeChangeArea[];
  repository: string;
  branch: string;
  pullRequest?: string;
  commit: string;
  filePath: string;
  changeSummary: string;
}

export interface RequirementCodeMapping extends Omit<TestCaseCodeReference, "mappingId"> {
  id: string;
  storyKey: string;
}

export interface StandardTestCase {
  id: string;
  version: number;
  title: string;
  priority: Priority;
  scenarioType: ScenarioCategory;
  preconditions: string[];
  steps: ScenarioStep[];
  expectedResult: string;
  traceability: TraceabilityReference;
  repositorySections?: JiraTestRepositorySection[];
  status: "draft" | "approved" | "deprecated";
}

export type JiraTestRepositorySection = "UI" | "API" | "Performance";

export function validateTestCases(testCases: StandardTestCase[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const testCase of testCases) {
    if (!/^TC-[1-9][0-9]*$/.test(testCase.id)) {
      errors.push(`Invalid test case identifier: ${testCase.id}`);
    }
    if (ids.has(testCase.id)) {
      errors.push(`Duplicate test case identifier: ${testCase.id}`);
    }
    ids.add(testCase.id);
    if (testCase.version < 1) {
      errors.push(`Test case ${testCase.id} must have a positive version.`);
    }
    if (testCase.steps.length === 0) {
      errors.push(`Test case ${testCase.id} requires at least one step.`);
    }
    testCase.steps.forEach((step, index) => {
      if (step.sequence !== index + 1) {
        errors.push(`Test case ${testCase.id} step sequence must be contiguous from 1.`);
      }
    });
    if (testCase.traceability.acceptanceCriteriaIds.length === 0) {
      errors.push(`Test case ${testCase.id} requires Acceptance Criterion traceability.`);
    }
    if (new Set(testCase.repositorySections ?? []).size !== (testCase.repositorySections ?? []).length) {
      errors.push(`Test case ${testCase.id} has duplicate Jira repository sections.`);
    }
    if (testCase.traceability.codeReferences.length === 0) {
      errors.push(`Test case ${testCase.id} requires implementation code traceability.`);
    }
    for (const [label, values] of [
      ["evidence", testCase.traceability.evidenceIds],
      ["API operation", testCase.traceability.apiOperationIds],
      ["historical issue", testCase.traceability.historicalIssueKeys],
      ["ADR", testCase.traceability.adrIds],
      ["test data set", testCase.traceability.testDataSetIds]
    ] as const) {
      if (values && new Set(values).size !== values.length) errors.push(`Test case ${testCase.id} has duplicate ${label} traceability references.`);
    }
    if (testCase.traceability.evidenceConfidence !== undefined &&
      (!Number.isFinite(testCase.traceability.evidenceConfidence) || testCase.traceability.evidenceConfidence < 0 || testCase.traceability.evidenceConfidence > 100)) {
      errors.push(`Test case ${testCase.id} evidence confidence must be between 0 and 100.`);
    }
    for (const codeReference of testCase.traceability.codeReferences) {
      if (!/^RCM-[1-9][0-9]*$/.test(codeReference.mappingId)) {
        errors.push(`Test case ${testCase.id} has an invalid requirement-to-code mapping ID.`);
      }
      for (const [label, value] of [
        ["repository", codeReference.repository],
        ["branch", codeReference.branch],
        ["commit", codeReference.commit],
        ["file path", codeReference.filePath],
        ["change summary", codeReference.changeSummary]
      ] as const) {
        if (!value.trim()) errors.push(`Test case ${testCase.id} has an empty code ${label}.`);
      }
      if (!testCase.traceability.acceptanceCriteriaIds.includes(codeReference.acceptanceCriteriaId)) {
        errors.push(`Test case ${testCase.id} has code evidence unrelated to its Acceptance Criteria.`);
      }
    }
  }

  return errors;
}
