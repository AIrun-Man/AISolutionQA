import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { RequirementAnalysis } from "../models/requirements.js";
import type { StandardTestCase } from "../models/test-cases.js";
import type { TestDataIntelligenceModel } from "../test-data/intelligence.js";
import type { JiraGenerationPaths, XrayImportFormat } from "../storage/generation.js";
import { redactSensitiveText, writeJsonArtifact } from "../reporting/generator.js";
import { validateTestCases } from "../models/test-cases.js";

export interface XrayAutomationLink {
  automationId: string;
  scriptPath: string;
  repository: string;
  branch: string;
  commit: string;
  pullRequest?: string;
}

export interface XrayExecutionLink {
  executionId: string;
  url?: string;
  status: string;
  executedAt?: string;
}

export interface XrayDefectLink {
  issueKey: string;
  url?: string;
}

export interface XrayTestTraceability {
  automationLinks?: XrayAutomationLink[];
  executions?: XrayExecutionLink[];
  defects?: XrayDefectLink[];
  stepData?: Record<number, string>;
}

export interface XrayImportStep {
  action: string;
  data: string;
  expectedResult: string;
}

export interface XrayImportTest {
  id: string;
  summary: string;
  objective: string;
  preconditions: string[];
  sourceRequirement: string[];
  expectedOutcome: string;
  testType: "Manual";
  status: "Draft" | "Approved" | "Deprecated";
  steps: XrayImportStep[];
  traceability: {
    storyKey: string;
    storyUrl: string;
    generatedTestCaseId: string;
    requirementIds: string[];
    acceptanceCriteriaIds: string[];
    scenarioIds: string[];
    testDataSetIds: string[];
    codeReferences: StandardTestCase["traceability"]["codeReferences"];
    evidenceIds: string[];
    apiOperationIds: string[];
    historicalIssueKeys: string[];
    adrIds: string[];
    evidenceConfidence?: number;
    automationLinks: XrayAutomationLink[];
    executions: XrayExecutionLink[];
    defects: XrayDefectLink[];
  };
}

export interface XrayImportModel {
  schemaVersion: "1.0.0";
  jiraStoryUrl: string;
  jiraProjectKey: string;
  xrayRepositoryPath: string;
  testManagementTool: "XRAY";
  tests: XrayImportTest[];
}

export interface XrayImportArtifactResult {
  canonicalJsonPath: string;
  csvPath?: string;
  canonicalModel: XrayImportModel;
}

export interface XrayTestIssueLink {
  storyKey: string;
  xrayTestId: string;
  generatedTestCaseId: string;
  jiraIssueKey: string;
  jiraIssueUrl: string;
  xrayRepositoryPath: string;
}

export type XrayTraceabilityByTestCase = Readonly<Record<string, XrayTestTraceability>>;

const csvColumns = [
  "Test ID",
  "Summary",
  "Repository Path",
  "Test Type",
  "Description",
  "Action",
  "Data",
  "Expected Result"
] as const;

function quoteCsv(value: string): string {
  const sanitized = redactSensitiveText(value);
  return /[",\r\n]/.test(sanitized) ? `"${sanitized.replaceAll('"', '""')}"` : sanitized;
}

function renderCsv(model: XrayImportModel): string {
  const rows: string[][] = [[...csvColumns]];
  for (const test of model.tests) {
    for (const [stepIndex, step] of test.steps.entries()) {
      rows.push([
        test.id,
        stepIndex === 0 ? test.summary : "",
        model.xrayRepositoryPath,
        test.testType,
        stepIndex === 0 ? `[AI][JIRA Story] ${test.objective}` : "",
        step.action,
        step.data,
        step.expectedResult
      ]);
    }
  }
  return rows.map((row) => row.map(quoteCsv).join(",")).join("\r\n") + "\r\n";
}

export function createCanonicalXrayImport(
  requirementAnalysis: RequirementAnalysis,
  testCases: StandardTestCase[],
  paths: JiraGenerationPaths,
  traceability: XrayTraceabilityByTestCase = {},
  testDataModel?: TestDataIntelligenceModel
): XrayImportModel {
  if (!paths.testManagementTool || paths.testManagementTool.toUpperCase() !== "XRAY") {
    throw new Error("Xray import artifacts require testManagementTool to be Xray.");
  }
  if (!paths.jiraProjectKey) throw new Error("Xray import artifacts require a Jira project key.");
  if (!paths.xrayRepositoryPath?.trim()) throw new Error("Xray import artifacts require xrayRepositoryPath.");
  if (paths.xrayCreateStoryFolder && !paths.xrayStoryFolderName.trim()) {
    throw new Error("Xray story folder name is required when xrayCreateStoryFolder is enabled.");
  }
  const urlStoryKey = (() => {
    try {
      const pathSegments = new URL(paths.jiraStoryUrl).pathname.split("/").filter(Boolean);
      const browseIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "browse");
      return browseIndex >= 0 ? pathSegments[browseIndex + 1] : undefined;
    } catch {
      return undefined;
    }
  })();
  if (urlStoryKey && urlStoryKey !== requirementAnalysis.story.key) {
    throw new Error(`Xray story URL ${urlStoryKey} does not match analyzed Story ${requirementAnalysis.story.key}.`);
  }
  if (testDataModel && testDataModel.storyKey !== requirementAnalysis.story.key) {
    throw new Error(`Test data model story ${testDataModel.storyKey} does not match ${requirementAnalysis.story.key}.`);
  }
  const errors = validateTestCases(testCases);
  if (errors.length > 0) throw new Error(`Cannot export invalid test cases to Xray: ${errors.join(" ")}`);
  const mismatchedStories = testCases.filter((testCase) => testCase.traceability.storyKey !== requirementAnalysis.story.key);
  if (mismatchedStories.length > 0) throw new Error(`Cannot export test cases from a different Jira Story: ${mismatchedStories.map((testCase) => testCase.id).join(", ")}.`);

  const acceptanceCriteria = new Map(requirementAnalysis.acceptanceCriteria.map((criterion) => [criterion.id, criterion.description]));
  const requirements = [
    ...(requirementAnalysis.functionalRequirements ?? []),
    ...(requirementAnalysis.nonFunctionalRequirements ?? []),
    ...(requirementAnalysis.businessRules ?? []),
    ...(requirementAnalysis.validationRules ?? []),
    ...(requirementAnalysis.implicitRequirements ?? []),
    ...(requirementAnalysis.risks ?? [])
  ];
  const scenarios = new Map(requirementAnalysis.scenarios.map((scenario) => [scenario.id, scenario]));
  const storyId = requirementAnalysis.story.key;
  const tests = testCases.map((testCase, index): XrayImportTest => {
    const testId = `[${storyId}][AI-${String(index + 1).padStart(2, "0")}]`;
    const testTraceability = traceability[testCase.id] ?? {};
    const testDataSets = (testDataModel?.automationDataSets ?? []).filter((dataSet) =>
      dataSet.acceptanceCriteriaIds.some((id) => testCase.traceability.acceptanceCriteriaIds.includes(id))
    );
    const testDataDescriptions = testDataSets.flatMap((dataSet) => dataSet.values.map((value) => {
      if (value.source === "synthetic" && value.value !== undefined) return `${value.fieldName}=${String(value.value)}`;
      if (value.source === "reusable") return `${value.fieldName} from ${value.reference ?? "approved reusable data"}`;
      if (value.source === "environment-reference") return `${value.fieldName} from environment variable ${value.reference ?? "configured secret reference"}`;
      return `${value.fieldName} requires approved data provisioning`;
    }));
    const sourceRequirement = requirements
      .filter((requirement) => requirement.acceptanceCriteriaIds.some((id) => testCase.traceability.acceptanceCriteriaIds.includes(id)))
      .map((requirement) => `${requirement.id}: ${requirement.description}`);
    const fallbackRequirement = testCase.traceability.acceptanceCriteriaIds
      .map((id) => `${id}: ${acceptanceCriteria.get(id) ?? "Source criterion unavailable"}`);
    const objective = testCase.traceability.scenarioIds
      .map((scenarioId) => scenarios.get(scenarioId)?.objective)
      .filter((value): value is string => Boolean(value))
      .join("; ") || `Verify ${testCase.title}`;
    const steps = testCase.steps.map((step) => ({
      action: step.action,
      data: testTraceability.stepData?.[step.sequence] ?? (testDataDescriptions.join("; ") || "Use approved synthetic test data; do not include secrets."),
      expectedResult: step.expectedOutcome
    }));

    return {
      id: testId,
      summary: `${testId} ${testCase.title}`,
      objective,
      preconditions: [...testCase.preconditions],
      sourceRequirement: sourceRequirement.length > 0 ? sourceRequirement : fallbackRequirement,
      expectedOutcome: testCase.expectedResult,
      testType: "Manual",
      status: testCase.status === "approved" ? "Approved" : testCase.status === "deprecated" ? "Deprecated" : "Draft",
      steps,
      traceability: {
        storyKey: storyId,
        storyUrl: paths.jiraStoryUrl,
        generatedTestCaseId: testCase.id,
        requirementIds: requirements.filter((requirement) => requirement.acceptanceCriteriaIds.some((id) => testCase.traceability.acceptanceCriteriaIds.includes(id))).map((requirement) => requirement.id),
        acceptanceCriteriaIds: [...testCase.traceability.acceptanceCriteriaIds],
        scenarioIds: [...testCase.traceability.scenarioIds],
        testDataSetIds: [...new Set([...(testCase.traceability.testDataSetIds ?? []), ...testDataSets.map((dataSet) => dataSet.id)])],
        codeReferences: [...testCase.traceability.codeReferences],
        evidenceIds: [...(testCase.traceability.evidenceIds ?? [])],
        apiOperationIds: [...(testCase.traceability.apiOperationIds ?? [])],
        historicalIssueKeys: [...(testCase.traceability.historicalIssueKeys ?? [])],
        adrIds: [...(testCase.traceability.adrIds ?? [])],
        ...(testCase.traceability.evidenceConfidence !== undefined ? { evidenceConfidence: testCase.traceability.evidenceConfidence } : {}),
        automationLinks: paths.linkAutomationToXray ? [...(testTraceability.automationLinks ?? [])] : [],
        executions: paths.updateXrayExecution ? [...(testTraceability.executions ?? [])] : [],
        defects: [...(testTraceability.defects ?? [])]
      }
    };
  });

  const storyFolder = paths.xrayCreateStoryFolder ? paths.xrayStoryFolderName : "";
  const repositoryPath = [paths.xrayRepositoryPath.replace(/\/+$/, ""), storyFolder].filter(Boolean).join("/");
  return {
    schemaVersion: "1.0.0",
    jiraStoryUrl: paths.jiraStoryUrl,
    jiraProjectKey: paths.jiraProjectKey,
    xrayRepositoryPath: repositoryPath,
    testManagementTool: "XRAY",
    tests
  };
}

export async function writeXrayImportArtifacts(
  model: XrayImportModel,
  paths: JiraGenerationPaths,
  format: XrayImportFormat = paths.xrayImportFormat
): Promise<XrayImportArtifactResult> {
  if (format !== "JSON" && format !== "CSV") throw new Error("Xray import format must be JSON or CSV.");
  if (model.testManagementTool !== "XRAY") throw new Error("Xray importer artifacts require the XRAY test management tool.");
  await mkdir(paths.xrayFolder, { recursive: true });
  const canonicalJsonPath = join(paths.xrayFolder, "xray-import.json");
  await writeJsonArtifact(model, paths.xrayFolder, "xray-import.json");
  const canonicalJson = JSON.parse(await readFile(canonicalJsonPath, "utf8")) as XrayImportModel;
  if (format === "JSON") return { canonicalJsonPath, canonicalModel: canonicalJson };
  const csvPath = join(paths.xrayFolder, "xray-import.csv");
  await writeFile(csvPath, renderCsv(canonicalJson), "utf8");
  return { canonicalJsonPath, csvPath, canonicalModel: canonicalJson };
}

export function validateXrayTestIssueLinks(links: XrayTestIssueLink[]): string[] {
  const errors: string[] = [];
  const xrayTestIds = new Set<string>();
  const issueKeys = new Set<string>();
  for (const link of links) {
    if (!/^\[[A-Z][A-Z0-9]+-[1-9][0-9]*\]\[AI-[0-9]{2,}\]$/.test(link.xrayTestId)) {
      errors.push(`Invalid generated Xray test ID: ${link.xrayTestId}.`);
    }
    if (!/^[A-Z][A-Z0-9]+-[1-9][0-9]*$/.test(link.storyKey)) errors.push(`Invalid Jira Story key: ${link.storyKey}.`);
    if (!/^TC-[1-9][0-9]*$/.test(link.generatedTestCaseId)) errors.push(`Invalid generated test-case ID: ${link.generatedTestCaseId}.`);
    if (!/^[A-Z][A-Z0-9]+-[1-9][0-9]*$/.test(link.jiraIssueKey)) errors.push(`Invalid imported Jira issue key: ${link.jiraIssueKey}.`);
    if (xrayTestIds.has(link.xrayTestId)) errors.push(`Duplicate Xray test link: ${link.xrayTestId}.`);
    xrayTestIds.add(link.xrayTestId);
    if (issueKeys.has(link.jiraIssueKey)) errors.push(`Duplicate Jira issue link: ${link.jiraIssueKey}.`);
    issueKeys.add(link.jiraIssueKey);
    for (const [label, value] of [
      ["story key", link.storyKey],
      ["generated test case ID", link.generatedTestCaseId],
      ["Jira issue key", link.jiraIssueKey],
      ["repository path", link.xrayRepositoryPath]
    ] as const) {
      if (!value.trim()) errors.push(`${label} is required for ${link.xrayTestId}.`);
    }
    try {
      const issueUrl = new URL(link.jiraIssueUrl);
      if (!["http:", "https:"].includes(issueUrl.protocol)) errors.push(`Jira issue URL must use HTTP or HTTPS: ${link.jiraIssueUrl}.`);
    } catch {
      errors.push(`Invalid Jira issue URL: ${link.jiraIssueUrl}.`);
    }
  }
  return errors;
}

export async function writeXrayTestIssueLinks(paths: JiraGenerationPaths, links: XrayTestIssueLink[]): Promise<void> {
  const errors = validateXrayTestIssueLinks(links);
  if (errors.length > 0) throw new Error(`Cannot write invalid Xray issue links: ${errors.join(" ")}`);
  await mkdir(paths.xrayFolder, { recursive: true });
  await writeJsonArtifact(links, paths.xrayFolder, "xray-test-links.json");
}
