import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import type { RequirementAnalysis } from "../models/requirements.js";
import type { RequirementCodeMapping, StandardTestCase } from "../models/test-cases.js";
import type { StoryReadinessReport, UnifiedEvidenceModel } from "../evidence/intelligence.js";
import type { ImplementationReconstructionModel, ImplementationSourceModel, ImplementationTrustReport } from "../implementation/lineage.js";
import { validateJiraTestCaseIssueLinks, type JiraTestCaseIssueLink } from "../test-cases/jira-links.js";
import { writeExecutionReport, writeJsonArtifact, type ExecutionSummary } from "../reporting/generator.js";
import { writeRequirementAnalysis } from "../requirements/engine.js";
import { writeRequirementCodeMappings, writeTestCases } from "../test-cases/engine.js";
import {
  validateAutomationRepositoryConfiguration,
  type AutomationRepositoryReference,
  type ExistingTestIntelligenceArtifacts
} from "../automation/intelligence.js";

export interface GenerationConfig {
  jiraUrl: string;
  jiraId: string;
  repositoryName: string;
  outputFolder: string;
  uiGenerationEnabled: boolean;
  apiGenerationEnabled: boolean;
  performanceGenerationEnabled: boolean;
  jiraStoryUrl?: string;
  jiraBoardUrl?: string;
  jiraProjectKey?: string;
  testRepositoryPath?: string;
  testManagementTool?: JiraTestManagementTool | "";
  xrayRepositoryPath?: string;
  xrayCreateStoryFolder?: boolean;
  xrayStoryFolderPattern?: string;
  xrayImportFormat?: XrayImportFormat;
  xrayAutoImport?: boolean;
  linkAutomationToXray?: boolean;
  updateXrayExecution?: boolean;
  minimumReadinessScore?: number;
  automationRepositories?: AutomationRepositoryReference[];
}

export type JiraTestSection = "UI" | "API" | "Performance";
export type JiraTestManagementTool = "Xray" | "XRAY" | "Zephyr" | "TM4J" | "Native Jira Issue Type";
export type XrayImportFormat = "JSON" | "CSV";

export interface JiraGenerationPaths {
  outputRoot: string;
  jiraFolder: string;
  uiGenerationEnabled: boolean;
  apiGenerationEnabled: boolean;
  performanceGenerationEnabled: boolean;
  jiraStoryUrl: string;
  jiraBoardUrl?: string;
  jiraProjectKey: string;
  testManagementTool?: JiraTestManagementTool;
  testRepositoryPaths: Record<JiraTestSection, string | undefined>;
  xrayFolder: string;
  xrayRepositoryPath?: string;
  xrayCreateStoryFolder: boolean;
  xrayStoryFolderName: string;
  xrayImportFormat: XrayImportFormat;
  xrayAutoImport: boolean;
  linkAutomationToXray: boolean;
  updateXrayExecution: boolean;
  minimumReadinessScore: number;
  uiScripts: string;
  uiLocators: string;
  uiVariables: string;
  apiScripts: string;
  apiLocators: string;
  apiVariables: string;
  apiReports: string;
  performanceScripts: string;
  uiReports: string;
  uiTestResults: string;
  requirementAnalysisFile: string;
  scenarioAnalysisFile: string;
  testCasesFile: string;
  executionSummaryFile: string;
}

export type GeneratedFileArea = "uiScripts" | "uiLocators" | "uiVariables" | "apiScripts" | "apiLocators" | "apiVariables" | "performanceScripts";

const configStringFields = ["jiraUrl", "jiraId", "repositoryName", "outputFolder"] as const;
const optionalDestinationFields = ["jiraStoryUrl", "jiraBoardUrl", "jiraProjectKey", "testRepositoryPath", "testManagementTool", "xrayRepositoryPath", "xrayStoryFolderPattern", "xrayImportFormat"] as const;
const configBooleanFields = ["uiGenerationEnabled", "apiGenerationEnabled", "performanceGenerationEnabled"] as const;
const optionalConfigBooleanFields = ["xrayCreateStoryFolder", "xrayAutoImport", "linkAutomationToXray", "updateXrayExecution"] as const;
const allowedConfigFields = new Set<string>([...configStringFields, ...optionalDestinationFields, ...configBooleanFields, ...optionalConfigBooleanFields, "minimumReadinessScore", "automationRepositories"]);
const supportedTestManagementTools = ["Xray", "XRAY", "Zephyr", "TM4J", "Native Jira Issue Type"] as const;

export function validateGenerationConfig(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["Generation configuration must be a JSON object."];
  }

  const config = value as Record<string, unknown>;
  const errors: string[] = [];
  for (const field of configStringFields) {
    if (typeof config[field] !== "string" || !config[field].trim()) {
      errors.push(`Generation configuration field ${field} must be a non-empty string.`);
    }
  }
  for (const field of configBooleanFields) {
    if (typeof config[field] !== "boolean") {
      errors.push(`Generation configuration field ${field} must be a boolean.`);
    }
  }
  for (const field of optionalDestinationFields) {
    if (config[field] !== undefined && typeof config[field] !== "string") {
      errors.push(`Generation configuration field ${field} must be a string when provided.`);
    }
  }
  for (const field of optionalConfigBooleanFields) {
    if (config[field] !== undefined && typeof config[field] !== "boolean") {
      errors.push(`Generation configuration field ${field} must be a boolean when provided.`);
    }
  }
  if (config.minimumReadinessScore !== undefined &&
    (typeof config.minimumReadinessScore !== "number" || !Number.isFinite(config.minimumReadinessScore) || config.minimumReadinessScore < 0 || config.minimumReadinessScore > 100)) {
    errors.push("Generation configuration minimumReadinessScore must be a number between 0 and 100.");
  }
  if (config.automationRepositories !== undefined) errors.push(...validateAutomationRepositoryConfiguration(config.automationRepositories));
  for (const field of Object.keys(config)) {
    if (!allowedConfigFields.has(field)) errors.push(`Unknown generation configuration field: ${field}.`);
  }

  if (typeof config.jiraId === "string" && !/^[A-Z][A-Z0-9]+-[1-9][0-9]*$/.test(config.jiraId)) {
    errors.push("Generation configuration jiraId must be a valid Jira issue key.");
  }
  if (typeof config.jiraUrl === "string" && config.jiraUrl.trim()) {
    try {
      const jiraUrl = new URL(config.jiraUrl);
      if (!["http:", "https:"].includes(jiraUrl.protocol)) errors.push("Generation configuration jiraUrl must use HTTP or HTTPS.");
    } catch {
      errors.push("Generation configuration jiraUrl must be a valid absolute URL.");
    }
  }
  for (const field of ["jiraStoryUrl", "jiraBoardUrl"] as const) {
    const value = config[field];
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) errors.push(`Generation configuration ${field} must use HTTP or HTTPS.`);
    } catch {
      errors.push(`Generation configuration ${field} must be a valid absolute URL.`);
    }
  }
  if (typeof config.jiraProjectKey === "string" && config.jiraProjectKey.trim() && !/^[A-Z][A-Z0-9]*$/.test(config.jiraProjectKey)) {
    errors.push("Generation configuration jiraProjectKey must be an uppercase Jira project key.");
  }
  if (typeof config.testRepositoryPath === "string" && config.testRepositoryPath.trim()) {
    const segments = config.testRepositoryPath.split(/[\\/]/);
    if (config.testRepositoryPath.startsWith("/") || config.testRepositoryPath.startsWith("\\") || segments.some((segment) => !segment || segment === "." || segment === "..")) {
      errors.push("Generation configuration testRepositoryPath must be a relative path without empty, dot, or parent segments.");
    }
  }
  if (typeof config.testManagementTool === "string" && config.testManagementTool && !supportedTestManagementTools.includes(config.testManagementTool as JiraTestManagementTool)) {
    errors.push(`Generation configuration testManagementTool must be one of: ${supportedTestManagementTools.join(", ")}.`);
  }
  if (typeof config.xrayImportFormat === "string" && config.xrayImportFormat && !["JSON", "CSV"].includes(config.xrayImportFormat)) {
    errors.push("Generation configuration xrayImportFormat must be JSON or CSV.");
  }
  if (typeof config.xrayStoryFolderPattern === "string" && /[\\/]|\.\./.test(config.xrayStoryFolderPattern)) {
    errors.push("Generation configuration xrayStoryFolderPattern must not contain path separators or parent segments.");
  }
  if (typeof config.xrayRepositoryPath === "string" && config.xrayRepositoryPath.trim()) {
    const segments = config.xrayRepositoryPath.split(/[\\/]/);
    if (config.xrayRepositoryPath.startsWith("/") || config.xrayRepositoryPath.startsWith("\\") || segments.some((segment) => !segment || segment === "." || segment === "..")) {
      errors.push("Generation configuration xrayRepositoryPath must be a relative path without empty, dot, or parent segments.");
    }
  }

  return errors;
}

export async function loadGenerationConfig(configPath = "generation-config.json"): Promise<GenerationConfig> {
  const parsed: unknown = JSON.parse(await readFile(configPath, "utf8"));
  const errors = validateGenerationConfig(parsed);
  if (errors.length > 0) throw new Error(`Invalid generation configuration: ${errors.join(" ")}`);
  return parsed as GenerationConfig;
}

export function resolveJiraGenerationPaths(config: GenerationConfig, configPath = "generation-config.json"): JiraGenerationPaths {
  const errors = validateGenerationConfig(config);
  if (errors.length > 0) throw new Error(`Invalid generation configuration: ${errors.join(" ")}`);
  const configDirectory = dirname(resolve(configPath));
  const outputRoot = isAbsolute(config.outputFolder)
    ? resolve(config.outputFolder)
    : resolve(configDirectory, config.outputFolder);
  const jiraFolder = join(outputRoot, config.jiraId);
  const xrayCreateStoryFolder = config.xrayCreateStoryFolder ?? true;
  const xrayStoryFolderPattern = config.xrayStoryFolderPattern?.trim() || "{storyId}";
  const xrayStoryFolderName = xrayStoryFolderPattern.replaceAll("{storyId}", config.jiraId);
  const uiFolder = join(jiraFolder, "UI");
  const apiFolder = join(jiraFolder, "API");
  const storyUrl = config.jiraStoryUrl?.trim() || config.jiraUrl;
  const projectKey = config.jiraProjectKey?.trim() || config.jiraId.split("-")[0] || "";
  const testRepositoryPaths = Object.fromEntries(([
    "UI", "API", "Performance"
  ] as const).map((section) => [section, resolveTestRepositoryPath(config.testRepositoryPath, section)])) as Record<JiraTestSection, string | undefined>;

  return {
    outputRoot,
    jiraFolder,
    uiGenerationEnabled: config.uiGenerationEnabled,
    apiGenerationEnabled: config.apiGenerationEnabled,
    performanceGenerationEnabled: config.performanceGenerationEnabled,
    jiraStoryUrl: storyUrl,
    ...(config.jiraBoardUrl?.trim() ? { jiraBoardUrl: config.jiraBoardUrl.trim() } : {}),
    jiraProjectKey: projectKey,
    ...(config.testManagementTool ? { testManagementTool: config.testManagementTool } : {}),
    testRepositoryPaths,
    xrayFolder: join(jiraFolder, "xray"),
    ...(config.xrayRepositoryPath?.trim() ? { xrayRepositoryPath: config.xrayRepositoryPath.trim() } : {}),
    xrayCreateStoryFolder,
    xrayStoryFolderName,
    xrayImportFormat: config.xrayImportFormat || "JSON",
    xrayAutoImport: config.xrayAutoImport ?? false,
    linkAutomationToXray: config.linkAutomationToXray ?? true,
    updateXrayExecution: config.updateXrayExecution ?? true,
    minimumReadinessScore: config.minimumReadinessScore ?? 80,
    uiScripts: join(uiFolder, "Scripts"),
    uiLocators: join(uiFolder, "Locators"),
    uiVariables: join(uiFolder, "Variables"),
    apiScripts: join(apiFolder, "Scripts"),
    apiLocators: join(apiFolder, "Locators"),
    apiVariables: join(apiFolder, "Variables"),
    apiReports: join(apiFolder, "Reports"),
    performanceScripts: join(jiraFolder, "Performance", "Scripts"),
    uiReports: join(uiFolder, "Reports"),
    uiTestResults: join(uiFolder, "TestResults"),
    requirementAnalysisFile: join(jiraFolder, "requirement-analysis.json"),
    scenarioAnalysisFile: join(jiraFolder, "scenario-analysis.json"),
    testCasesFile: join(jiraFolder, "test-cases.json"),
    executionSummaryFile: join(jiraFolder, "execution-summary.json")
  };
}

export function resolveTestRepositoryPath(basePath: string | undefined, section: JiraTestSection): string | undefined {
  const normalizedPath = basePath?.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!normalizedPath) return undefined;
  const segments = normalizedPath.split("/");
  const existingSectionIndex = segments.findIndex((segment) => ["UI", "API", "Performance"].includes(segment));
  if (existingSectionIndex >= 0) segments[existingSectionIndex] = section;
  else segments.push(section);
  return segments.join("/");
}

export async function createJiraGenerationLayout(paths: JiraGenerationPaths): Promise<void> {
  const directories = [
    paths.xrayFolder,
    paths.uiScripts,
    paths.uiLocators,
    paths.uiVariables,
    paths.apiScripts,
    paths.apiLocators,
    paths.apiVariables,
    paths.apiReports,
    paths.uiReports,
    paths.uiTestResults,
    ...(paths.performanceGenerationEnabled ? [paths.performanceScripts] : [])
  ];
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));
}

export async function writeGeneratedFile(
  paths: JiraGenerationPaths,
  area: GeneratedFileArea,
  fileName: string,
  content: string
): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.[A-Za-z0-9]+$/.test(fileName) || basename(fileName) !== fileName) {
    throw new Error("Generated file name must be a simple file name without path segments.");
  }
  if (area.startsWith("ui") && !paths.uiGenerationEnabled) {
    throw new Error("UI artifact generation is disabled by generation-config.json.");
  }
  if (area.startsWith("api") && !paths.apiGenerationEnabled) {
    throw new Error("API artifact generation is disabled by generation-config.json.");
  }
  if (area === "performanceScripts" && !paths.performanceGenerationEnabled) {
    throw new Error("Performance artifact generation is disabled by generation-config.json.");
  }
  const filePath = join(paths[area], fileName);
  await mkdir(paths[area], { recursive: true });
  await writeFile(filePath, content, "utf8");
  return filePath;
}

export async function writeJiraArtifactJson(paths: JiraGenerationPaths, fileName: string, value: unknown): Promise<void> {
  await writeJsonArtifact(value, paths.jiraFolder, fileName);
}

export async function writeExistingTestIntelligenceForJiraStory(
  paths: JiraGenerationPaths,
  artifacts: ExistingTestIntelligenceArtifacts
): Promise<void> {
  const outputs: Array<[string, unknown]> = [
    ["existing-test-intelligence.json", artifacts],
    ["automation-repository-model.json", artifacts.repositories],
    ["framework-intelligence-model.json", artifacts.frameworks],
    ["repository-standards-model.json", artifacts.standards],
    ["pipeline-execution-model.json", artifacts.pipelines],
    ["test-inventory.json", artifacts.inventory],
    ["automation-inventory.json", artifacts.inventory.automation],
    ["suite-inventory.json", artifacts.inventory.suites],
    ["coverage-discovery-model.json", artifacts.coverage],
    ["regression-impact-model.json", artifacts.regressionImpact],
    ["coverage-delta-model.json", artifacts.coverageDelta],
    ["reuse-generation-strategy.json", artifacts.reuseStrategy],
    ["reuse-governance-report.json", artifacts.reuseGovernance],
    ["execution-recommendation.json", artifacts.executionRecommendation]
  ];
  await Promise.all(outputs.map(([fileName, value]) => writeJiraArtifactJson(paths, fileName, value)));
}

export async function writeRequirementAnalysisForJiraStory(
  paths: JiraGenerationPaths,
  analysis: RequirementAnalysis
): Promise<void> {
  await writeRequirementAnalysis(analysis, paths.jiraFolder);
}

export async function writeScenarioAnalysisForJiraStory(
  paths: JiraGenerationPaths,
  analysis: RequirementAnalysis
): Promise<void> {
  await writeJiraArtifactJson(paths, "scenario-analysis.json", analysis.scenarios);
}

export async function writeTestCasesForJiraStory(
  paths: JiraGenerationPaths,
  testCases: StandardTestCase[]
): Promise<void> {
  await writeTestCases(testCases, paths.testCasesFile);
}

export async function writeExecutionSummaryForJiraStory(
  paths: JiraGenerationPaths,
  summary: ExecutionSummary
): Promise<void> {
  await writeExecutionReport(summary, paths.jiraFolder);
}

export async function writeRequirementCodeMappingsForJiraStory(
  paths: JiraGenerationPaths,
  analysis: RequirementAnalysis,
  mappings: RequirementCodeMapping[]
): Promise<void> {
  await writeRequirementCodeMappings(analysis, mappings, paths.jiraFolder);
}

export async function writeUnifiedEvidenceForJiraStory(
  paths: JiraGenerationPaths,
  model: UnifiedEvidenceModel
): Promise<void> {
  if (basename(paths.jiraFolder) !== model.storyKey) {
    throw new Error(`Evidence model story ${model.storyKey} does not match the configured Jira output folder.`);
  }
  await writeJiraArtifactJson(paths, "unified-evidence-model.json", model);
}

export async function writeStoryReadinessForJiraStory(
  paths: JiraGenerationPaths,
  report: StoryReadinessReport
): Promise<void> {
  if (basename(paths.jiraFolder) !== report.storyKey) {
    throw new Error(`Readiness report story ${report.storyKey} does not match the configured Jira output folder.`);
  }
  await writeJiraArtifactJson(paths, "story-readiness.json", report);
}

export async function writeImplementationSourceForJiraStory(
  paths: JiraGenerationPaths,
  model: ImplementationSourceModel
): Promise<void> {
  if (basename(paths.jiraFolder) !== model.storyKey) {
    throw new Error(`Implementation source story ${model.storyKey} does not match the configured Jira output folder.`);
  }
  await writeJiraArtifactJson(paths, "implementation-source-model.json", model);
}

export async function writeImplementationReconstructionForJiraStory(
  paths: JiraGenerationPaths,
  model: ImplementationReconstructionModel
): Promise<void> {
  if (basename(paths.jiraFolder) !== model.storyKey) {
    throw new Error(`Implementation reconstruction story ${model.storyKey} does not match the configured Jira output folder.`);
  }
  await writeJiraArtifactJson(paths, "implementation-reconstruction-model.json", model);
}

export async function writeImplementationTrustForJiraStory(
  paths: JiraGenerationPaths,
  report: ImplementationTrustReport
): Promise<void> {
  if (basename(paths.jiraFolder) !== report.storyKey) {
    throw new Error(`Implementation trust story ${report.storyKey} does not match the configured Jira output folder.`);
  }
  await writeJiraArtifactJson(paths, "implementation-trust-report.json", report);
}

export async function writeJiraTestCaseIssueLinks(
  paths: JiraGenerationPaths,
  links: JiraTestCaseIssueLink[]
): Promise<void> {
  const errors = validateJiraTestCaseIssueLinks(links);
  if (errors.length > 0) throw new Error(`Cannot write invalid Jira test-case links: ${errors.join(" ")}`);
  await writeJiraArtifactJson(paths, "jira-test-case-links.json", links);
}