import type { RequirementAnalysis } from "../models/requirements.js";
import { validateRequirementAnalysis } from "../models/requirements.js";
import { writeJsonArtifact } from "../reporting/generator.js";

export type ExistingTestStatus = "active" | "deprecated" | "unknown";
export type ExistingExecutionResult = "passed" | "failed" | "blocked" | "skipped" | "incomplete";

export interface ExistingXrayTestAsset {
  issueKey: string;
  issueUrl: string;
  summary: string;
  sourceStoryKey?: string;
  mappedAcceptanceCriteriaIds?: string[];
  status: ExistingTestStatus;
  repositoryPath: string;
  folderPath: string;
  acceptanceCriteriaIds: string[];
  scenarioIds: string[];
  automationPaths: string[];
}

export interface ExistingXrayExecution {
  issueKey: string;
  executionKey: string;
  result: ExistingExecutionResult;
  executedAt: string;
}

export interface HistoricalTestCoverage {
  observedAt: string;
  sourceStoryKey?: string;
  mappedAcceptanceCriteriaIds?: string[];
  acceptanceCriteriaIds: string[];
  testIssueKeys: string[];
}

export interface ExistingAutomationAsset {
  id: string;
  title: string;
  path: string;
  strategy: "ui" | "api" | "contract" | "performance";
  active: boolean;
  sourceStoryKey?: string;
  mappedAcceptanceCriteriaIds?: string[];
  acceptanceCriteriaIds: string[];
  scenarioIds: string[];
  testIssueKey?: string;
}

export interface ExistingRegressionSuite {
  id: string;
  name: string;
  sourceStoryKey?: string;
  mappedAcceptanceCriteriaIds?: string[];
  testIssueKeys: string[];
  acceptanceCriteriaIds: string[];
  scenarioIds: string[];
}

export interface ExistingXrayRepositoryInventory {
  repositories: Array<{ path: string; name: string }>;
  folders: Array<{ repositoryPath: string; path: string; name: string }>;
  tests: ExistingXrayTestAsset[];
  executions: ExistingXrayExecution[];
  historicalCoverage: HistoricalTestCoverage[];
  automationAssets?: ExistingAutomationAsset[];
  regressionSuites?: ExistingRegressionSuite[];
}

export interface XrayCoverageDeltaRow {
  acceptanceCriteriaId: string;
  activeTestIssueKeys: string[];
  historicalTestIssueKeys: string[];
  lastExecutionResult?: ExistingExecutionResult;
  lastExecutedAt?: string;
  status: "covered" | "historical-only" | "missing";
}

export interface XrayRepositoryAnalysis {
  schemaVersion: "1.0.0";
  storyKey: string;
  repositories: ExistingXrayRepositoryInventory["repositories"];
  folders: ExistingXrayRepositoryInventory["folders"];
  activeTestCount: number;
  deprecatedTestCount: number;
  duplicateGroups: Array<{ signature: string; issueKeys: string[]; summary: string }>;
  coverageDelta: XrayCoverageDeltaRow[];
  warnings: string[];
}

export interface TestReuseScenarioFinding {
  scenarioId: string;
  acceptanceCriteriaIds: string[];
  decision: "reusable" | "partial-reuse" | "missing";
  matchingTestIssueKeys: string[];
  exactTestIssueKeys: string[];
  matchingAutomationPaths: string[];
  exactAutomationPaths: string[];
  regressionSuiteNames: string[];
  recommendation: string;
}

export interface TestReuseCoverageDeltaRow {
  acceptanceCriteriaId: string;
  reusableTestIssueKeys: string[];
  automationPaths: string[];
  regressionSuiteIds: string[];
  historicalTestIssueKeys: string[];
  status: "covered" | "historical-only" | "missing";
}

export interface TestReuseAnalysis {
  schemaVersion: "1.0.0";
  storyKey: string;
  scenarioFindings: TestReuseScenarioFinding[];
  reusableScenarioIds: string[];
  partialReuseScenarioIds: string[];
  missingScenarioIds: string[];
  missingAcceptanceCriteriaIds: string[];
  coverageDelta: TestReuseCoverageDeltaRow[];
  newTestRecommendations: Array<{ scenarioId: string; acceptanceCriteriaIds: string[]; action: "create" | "extend-existing" | "link-existing"; rationale: string }>;
}

function normalizedSummary(summary: string): string {
  return summary.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function criteriaForStory(
  asset: { acceptanceCriteriaIds: string[]; sourceStoryKey?: string; mappedAcceptanceCriteriaIds?: string[] },
  storyKey: string
): string[] {
  if (asset.sourceStoryKey && asset.sourceStoryKey !== storyKey) return asset.mappedAcceptanceCriteriaIds ?? [];
  return asset.acceptanceCriteriaIds;
}

function validateInventory(inventory: ExistingXrayRepositoryInventory): string[] {
  const errors: string[] = [];
  const issueKeys = new Set<string>();
  for (const test of inventory.tests) {
    if (!test.issueKey.trim() || !test.summary.trim() || !test.repositoryPath.trim() || !test.folderPath.trim()) {
      errors.push("Existing Xray test assets require issue key, summary, repository path, and folder path.");
    }
    if (issueKeys.has(test.issueKey)) errors.push(`Duplicate Xray test asset issue key: ${test.issueKey}.`);
    issueKeys.add(test.issueKey);
  }
  for (const execution of inventory.executions) {
    if (!issueKeys.has(execution.issueKey)) errors.push(`Execution ${execution.executionKey} references unknown Xray test ${execution.issueKey}.`);
    if (!Number.isFinite(Date.parse(execution.executedAt))) errors.push(`Execution ${execution.executionKey} has an invalid timestamp.`);
  }
  for (const snapshot of inventory.historicalCoverage) {
    if (!Number.isFinite(Date.parse(snapshot.observedAt))) errors.push("Historical coverage snapshots require valid timestamps.");
  }
  for (const automation of inventory.automationAssets ?? []) {
    if (!automation.id.trim() || !automation.title.trim() || !automation.path.trim()) errors.push("Existing automation assets require ID, title, and path.");
  }
  for (const suite of inventory.regressionSuites ?? []) {
    if (!suite.id.trim() || !suite.name.trim()) errors.push("Regression suites require ID and name.");
  }
  return errors;
}

function latestExecution(executions: ExistingXrayExecution[]): ExistingXrayExecution | undefined {
  return [...executions].sort((left, right) => Date.parse(right.executedAt) - Date.parse(left.executedAt))[0];
}

export function analyzeExistingXrayRepository(
  analysis: RequirementAnalysis,
  inventory: ExistingXrayRepositoryInventory
): XrayRepositoryAnalysis {
  const requirementErrors = validateRequirementAnalysis(analysis).errors;
  const inventoryErrors = validateInventory(inventory);
  if (requirementErrors.length || inventoryErrors.length) {
    throw new Error(`Cannot analyze existing Xray repository: ${[...requirementErrors, ...inventoryErrors].join(" ")}`);
  }

  const activeTests = inventory.tests.filter((test) => test.status === "active");
  const duplicateGroups = new Map<string, { issueKeys: string[]; summary: string }>();
  for (const test of activeTests) {
    const criteria = sortedUnique(criteriaForStory(test, analysis.story.key)).join("|");
    if (!criteria) continue;
    const signature = `${normalizedSummary(test.summary)}::${criteria}`;
    const group = duplicateGroups.get(signature) ?? { issueKeys: [], summary: test.summary };
    group.issueKeys.push(test.issueKey);
    duplicateGroups.set(signature, group);
  }

  const coverageDelta = analysis.acceptanceCriteria.map((criterion): XrayCoverageDeltaRow => {
    const matchingTests = activeTests.filter((test) => criteriaForStory(test, analysis.story.key).includes(criterion.id));
    const historicalTestIssueKeys = sortedUnique(inventory.historicalCoverage
      .filter((snapshot) => criteriaForStory(snapshot, analysis.story.key).includes(criterion.id))
      .flatMap((snapshot) => snapshot.testIssueKeys));
    const relatedIssueKeys = new Set([...matchingTests.map((test) => test.issueKey), ...historicalTestIssueKeys]);
    const last = latestExecution(inventory.executions.filter((execution) => relatedIssueKeys.has(execution.issueKey)));
    return {
      acceptanceCriteriaId: criterion.id,
      activeTestIssueKeys: matchingTests.map((test) => test.issueKey),
      historicalTestIssueKeys,
      ...(last ? { lastExecutionResult: last.result, lastExecutedAt: last.executedAt } : {}),
      status: matchingTests.length > 0 ? "covered" : historicalTestIssueKeys.length > 0 ? "historical-only" : "missing"
    };
  });

  const folders = [...inventory.folders];
  const folderKeys = new Set(folders.map((folder) => `${folder.repositoryPath}/${folder.path}`));
  for (const test of inventory.tests) {
    const folderKey = `${test.repositoryPath}/${test.folderPath}`;
    if (!folderKeys.has(folderKey)) {
      folders.push({ repositoryPath: test.repositoryPath, path: test.folderPath, name: test.folderPath.split(/[\\/]/).filter(Boolean).at(-1) ?? test.folderPath });
      folderKeys.add(folderKey);
    }
  }
  const repositories = [...inventory.repositories];
  const repositoryPaths = new Set(repositories.map((repository) => repository.path));
  for (const test of inventory.tests) {
    if (!repositoryPaths.has(test.repositoryPath)) {
      repositories.push({ path: test.repositoryPath, name: test.repositoryPath.split(/[\\/]/).filter(Boolean).at(-1) ?? test.repositoryPath });
      repositoryPaths.add(test.repositoryPath);
    }
  }

  return {
    schemaVersion: "1.0.0",
    storyKey: analysis.story.key,
    repositories,
    folders,
    activeTestCount: activeTests.length,
    deprecatedTestCount: inventory.tests.filter((test) => test.status === "deprecated").length,
    duplicateGroups: [...duplicateGroups.entries()]
      .filter(([, group]) => group.issueKeys.length > 1)
      .map(([signature, group]) => ({ signature, issueKeys: sortedUnique(group.issueKeys), summary: group.summary })),
    coverageDelta,
    warnings: inventory.tests.filter((test) => test.status === "unknown").map((test) => `Xray test ${test.issueKey} has unknown active/deprecated status and was not counted as current coverage.`)
  };
}

export function analyzeTestReuse(
  analysis: RequirementAnalysis,
  inventory: ExistingXrayRepositoryInventory,
  repositoryAnalysis = analyzeExistingXrayRepository(analysis, inventory)
): TestReuseAnalysis {
  if (repositoryAnalysis.storyKey !== analysis.story.key) throw new Error("Xray repository analysis belongs to a different Jira story.");
  const activeTests = inventory.tests.filter((test) => test.status === "active");
  const activeAutomation = (inventory.automationAssets ?? []).filter((automation) => automation.active);
  const regressionSuites = inventory.regressionSuites ?? [];
  const scenarioFindings = analysis.scenarios.map((scenario): TestReuseScenarioFinding => {
    const scenarioCriteria = sortedUnique(scenario.acceptanceCriteriaIds);
    const candidates = activeTests.filter((test) => criteriaForStory(test, analysis.story.key).some((id) => scenarioCriteria.includes(id)));
    const exactTestIssueKeys = candidates.filter((test) =>
      test.scenarioIds.includes(scenario.id) ||
      (normalizedSummary(test.summary) === normalizedSummary(scenario.title) &&
        JSON.stringify(sortedUnique(criteriaForStory(test, analysis.story.key))) === JSON.stringify(scenarioCriteria))
    ).map((test) => test.issueKey);
    const matchingTestIssueKeys = candidates.map((test) => test.issueKey);
    const matchingAutomation = activeAutomation.filter((automation) => criteriaForStory(automation, analysis.story.key).some((id) => scenarioCriteria.includes(id)));
    const linkedAutomationPaths = candidates.flatMap((test) => test.automationPaths);
    const exactAutomationPaths = matchingAutomation.filter((automation) =>
      automation.scenarioIds.includes(scenario.id) ||
      (normalizedSummary(automation.title) === normalizedSummary(scenario.title) &&
        JSON.stringify(sortedUnique(criteriaForStory(automation, analysis.story.key))) === JSON.stringify(scenarioCriteria))
    ).map((automation) => automation.path);
    const regressionSuiteNames = regressionSuites.filter((suite) =>
      criteriaForStory(suite, analysis.story.key).some((id) => scenarioCriteria.includes(id)) || suite.scenarioIds.includes(scenario.id)
    ).map((suite) => suite.name);
    const decision: TestReuseScenarioFinding["decision"] = exactTestIssueKeys.length > 0 || exactAutomationPaths.length > 0
      ? "reusable"
      : matchingTestIssueKeys.length > 0 || matchingAutomation.length > 0 || regressionSuiteNames.length > 0 ? "partial-reuse" : "missing";
    const recommendation = exactTestIssueKeys.length > 0
      ? "Reuse the existing Xray test and linked automation; do not create a duplicate."
      : exactAutomationPaths.length > 0
        ? "Reuse the existing automation and link it to the requirement; do not create a duplicate script."
        : decision === "partial-reuse"
          ? "Review matching Xray tests, automation, and regression suites; extend or add only uncovered scenario behavior."
          : "Create a new Xray test for this uncovered scenario.";
    return {
      scenarioId: scenario.id,
      acceptanceCriteriaIds: scenarioCriteria,
      decision,
      matchingTestIssueKeys,
      exactTestIssueKeys,
      matchingAutomationPaths: sortedUnique([...linkedAutomationPaths, ...matchingAutomation.map((automation) => automation.path)]),
      exactAutomationPaths: sortedUnique(exactAutomationPaths),
      regressionSuiteNames,
      recommendation
    };
  });

  const reusableScenarioIds = scenarioFindings.filter((finding) => finding.decision === "reusable").map((finding) => finding.scenarioId);
  const partialReuseScenarioIds = scenarioFindings.filter((finding) => finding.decision === "partial-reuse").map((finding) => finding.scenarioId);
  const missingScenarioIds = scenarioFindings.filter((finding) => finding.decision === "missing").map((finding) => finding.scenarioId);
  const coverageDelta: TestReuseCoverageDeltaRow[] = analysis.acceptanceCriteria.map((criterion) => {
    const criteriaTests = activeTests.filter((test) => criteriaForStory(test, analysis.story.key).includes(criterion.id));
    const automationPaths = sortedUnique([
      ...activeTests.filter((test) => criteriaForStory(test, analysis.story.key).includes(criterion.id)).flatMap((test) => test.automationPaths),
      ...activeAutomation.filter((automation) => criteriaForStory(automation, analysis.story.key).includes(criterion.id)).map((automation) => automation.path)
    ]);
    const criteriaSuites = regressionSuites.filter((suite) => criteriaForStory(suite, analysis.story.key).includes(criterion.id));
    const historicalTestIssueKeys = sortedUnique(inventory.historicalCoverage
      .filter((snapshot) => criteriaForStory(snapshot, analysis.story.key).includes(criterion.id))
      .flatMap((snapshot) => snapshot.testIssueKeys));
    const currentlyCovered = criteriaTests.length > 0 || automationPaths.length > 0 || criteriaSuites.length > 0;
    return {
      acceptanceCriteriaId: criterion.id,
      reusableTestIssueKeys: criteriaTests.map((test) => test.issueKey),
      automationPaths,
      regressionSuiteIds: criteriaSuites.map((suite) => suite.id),
      historicalTestIssueKeys,
      status: currentlyCovered ? "covered" : historicalTestIssueKeys.length > 0 ? "historical-only" : "missing"
    };
  });
  const missingAcceptanceCriteriaIds = coverageDelta.filter((row) => row.status !== "covered").map((row) => row.acceptanceCriteriaId);
  const newTestRecommendations = scenarioFindings
    .filter((finding) => finding.decision !== "reusable" || (finding.exactAutomationPaths.length > 0 && finding.exactTestIssueKeys.length === 0))
    .map((finding) => ({
      scenarioId: finding.scenarioId,
      acceptanceCriteriaIds: finding.acceptanceCriteriaIds,
      action: finding.decision === "partial-reuse"
        ? "extend-existing" as const
        : finding.exactAutomationPaths.length > 0 && finding.exactTestIssueKeys.length === 0
          ? "link-existing" as const
          : "create" as const,
      rationale: finding.recommendation
    }));
  return {
    schemaVersion: "1.0.0",
    storyKey: analysis.story.key,
    scenarioFindings,
    reusableScenarioIds,
    partialReuseScenarioIds,
    missingScenarioIds,
    missingAcceptanceCriteriaIds,
    coverageDelta,
    newTestRecommendations
  };
}

export function writeXrayRepositoryAnalysis(analysis: XrayRepositoryAnalysis, outputDirectory: string): Promise<void> {
  return writeJsonArtifact(analysis, outputDirectory, "xray-repository-analysis.json");
}

export async function writeTestReuseAnalysis(analysis: TestReuseAnalysis, outputDirectory: string): Promise<void> {
  await writeJsonArtifact(analysis, outputDirectory, "test-reuse-analysis.json");
}