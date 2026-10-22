import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  analyzeCoverageDelta,
  analyzeFrameworkIntelligence,
  analyzePipelineIntelligence,
  analyzeRegressionImpact,
  analyzeRepositoryStandards,
  buildReuseFirstStrategy,
  buildSmartRegressionRecommendation,
  buildTestInventory,
  createQualityWorkflowPlan,
  discoverAutomationRepositories,
  discoverCoverage,
  resolveJiraGenerationPaths,
  selectProgressiveDisclosureRoute,
  validateAutomationRepositoryConfiguration,
  validateQualityWorkflowPlan,
  validateReuseGovernance,
  writeExistingTestIntelligenceForJiraStory,
  type AutomationRepositorySnapshot,
  type ExistingAutomationRepositoryAsset
} from "../index.js";

const configuredRepositories = [
  { kind: "ui" as const, repository: "MBSE-GHEC/mbse-test-automation", purpose: "UI automation" },
  { kind: "api" as const, repository: "MBSE-GHEC/mbse-api-test-automation", purpose: "API automation" }
];

const automation: ExistingAutomationRepositoryAsset = {
  id: "AUTO-LOGIN-1",
  title: "Login accepts a valid account",
  repository: "MBSE-GHEC/mbse-test-automation",
  path: "src/tests/login.spec.ts",
  strategy: "ui",
  active: true,
  coverageStatus: "current",
  sourceFingerprint: createHash("sha256").update("duplicate").digest("hex"),
  testIssueKeys: ["QE-101"],
  requirementIds: ["REQ-LOGIN"],
  acceptanceCriteriaIds: ["AC-LOGIN"],
  scenarioIds: ["SC-LOGIN"],
  apiIds: [],
  componentIds: ["LOGIN-FORM"],
  businessLogicIds: [],
  changedFiles: ["src/auth/login.ts"],
  suiteIds: ["SMOKE-UI", "REGRESSION-UI"],
  utilityRefs: ["auth-client"]
};

const uiSnapshot: AutomationRepositorySnapshot = {
  repository: "MBSE-GHEC/mbse-test-automation",
  acquisitionStatus: "available",
  revision: "a".repeat(40),
  defaultBranch: "main",
  files: [
    { path: "package.json", content: '{"devDependencies":{"@playwright/test":"1.50.0","vitest":"2.0.0"}}' },
    { path: "src/pages/LoginPage.ts", content: "export class LoginPage {}" },
    { path: "src/tests/login.spec.ts", content: "page.getByRole('button'); expect(true).toBe(true);" },
    { path: "src/utils/auth.ts", content: "export const login = true;" },
    { path: "src/auth/login.ts", content: "export const authenticate = true;" }
  ],
  automation: [automation],
  xrayTests: [
    {
      issueKey: "QE-101",
      summary: "Login accepts a valid account",
      active: true,
      coverageStatus: "current",
      requirementIds: ["REQ-LOGIN"],
      acceptanceCriteriaIds: ["AC-LOGIN"],
      scenarioIds: ["SC-LOGIN"],
      apiIds: [],
      componentIds: ["LOGIN-FORM"],
      businessLogicIds: [],
      suiteIds: ["SMOKE-UI", "REGRESSION-UI"]
    },
    {
      issueKey: "QE-102",
      summary: "Search endpoint returns results",
      active: true,
      coverageStatus: "current",
      requirementIds: [],
      acceptanceCriteriaIds: [],
      scenarioIds: [],
      apiIds: ["API-SEARCH"],
      componentIds: [],
      businessLogicIds: [],
      suiteIds: ["API-SUITE"]
    }
  ],
  suites: [
    { id: "SMOKE-UI", name: "UI smoke", kind: "smoke", testIds: ["QE-101", "AUTO-LOGIN-1"] },
    { id: "REGRESSION-UI", name: "UI regression", kind: "regression", testIds: ["QE-101", "AUTO-LOGIN-1", "QE-102"] },
    { id: "API-SUITE", name: "API regression", kind: "api", testIds: ["QE-102"] }
  ],
  workflows: [{
    path: ".github/workflows/quality.yml",
    name: "Quality checks",
    triggers: ["pull_request"],
    executionCommands: ["npm ci", "npx playwright test"],
    environmentVariables: ["BASE_URL", "TEST_ENV"],
    reports: ["Playwright HTML report"],
    artifacts: ["playwright-report"],
    actionReferences: ["actions/checkout@" + "a".repeat(40)]
  }]
};

test("discovers only configured repositories and preserves acquisition gaps", () => {
  assert.deepEqual(validateAutomationRepositoryConfiguration(configuredRepositories), []);
  assert.ok(validateAutomationRepositoryConfiguration([configuredRepositories[0]!]).some((error) => error.includes("API")));
  const model = discoverAutomationRepositories(configuredRepositories, [uiSnapshot]);
  assert.equal(model.repositories[0]?.repositoryOwner, "MBSE-GHEC");
  assert.equal(model.repositories[0]?.inventory.automationCount, 1);
  assert.ok(model.repositories[0]?.inventory.files.includes("src/tests/login.spec.ts"));
  assert.equal(model.repositories[1]?.acquisitionStatus, "not-cloned");
  assert.ok(model.repositories[1]?.warnings[0]?.includes("not been acquired"));
});

test("identifies framework, repository standards, pipeline, and inventory evidence", () => {
  const frameworks = analyzeFrameworkIntelligence([uiSnapshot]).repositories[0]!;
  assert.deepEqual(frameworks.programmingLanguages, ["TypeScript"]);
  assert.deepEqual(frameworks.uiFramework, ["Playwright"]);
  assert.deepEqual(frameworks.executionFramework, ["Playwright Test", "Vitest"]);
  assert.ok(frameworks.pageObjects.includes("src/pages/LoginPage.ts"));
  const standards = analyzeRepositoryStandards([uiSnapshot]).repositories[0]!;
  assert.ok(standards.locatorStrategies.includes("getByRole"));
  assert.ok(standards.assertionPatterns.includes("expect"));
  const pipeline = analyzePipelineIntelligence([uiSnapshot]).repositories[0]!;
  assert.equal(pipeline.githubActionsCompatible, true);
  assert.deepEqual(pipeline.executionCommands, ["npm ci", "npx playwright test"]);
  assert.deepEqual(pipeline.environmentVariables, ["BASE_URL", "TEST_ENV"]);
  const inventory = buildTestInventory([uiSnapshot]);
  assert.equal(inventory.tests.length, 3);
  assert.equal(inventory.automation.length, 1);
  assert.equal(inventory.suites.length, 3);
});

test("discovers explicit coverage, reuse decisions, and missing-only generation scope", () => {
  const inventory = buildTestInventory([uiSnapshot]);
  const coverage = discoverCoverage([
    { id: "AC-LOGIN", kind: "acceptance-criterion", testRequired: true, automationRequired: true },
    { id: "AC-RESET", kind: "acceptance-criterion", testRequired: true, automationRequired: true },
    { id: "API-SEARCH", kind: "api", testRequired: true, automationRequired: true }
  ], inventory);
  assert.deepEqual(coverage.rows.map(({ status }) => status), ["covered", "missing", "partial"]);
  const delta = analyzeCoverageDelta(coverage, ["AC-LOGIN", "AC-RESET"]);
  assert.deepEqual(delta.impactedCoveredTargetIds, ["AC-LOGIN"]);
  assert.deepEqual(delta.impactedMissingTargetIds, ["AC-RESET"]);
  const strategy = buildReuseFirstStrategy(coverage);
  assert.deepEqual(strategy.phases, [
    "reuse-existing-tests",
    "reuse-existing-automation",
    "extend-existing-tests",
    "extend-existing-automation",
    "generate-missing-test-cases",
    "generate-missing-automation"
  ]);
  assert.equal(strategy.decisions[0]?.action, "reuse-existing-test-and-automation");
  assert.equal(strategy.decisions[1]?.action, "generate-missing-test-and-automation");
  assert.equal(strategy.decisions[2]?.action, "reuse-test-generate-automation");
  assert.deepEqual(strategy.testGenerationTargetIds, ["AC-RESET"]);
  assert.deepEqual(strategy.automationGenerationTargetIds, ["AC-RESET", "API-SEARCH"]);
  const testOnlyInventory = { ...inventory, automation: [], tests: inventory.tests.filter(({ source }) => source === "xray") };
  const testOnlyCoverage = discoverCoverage([
    { id: "AC-LOGIN", kind: "acceptance-criterion", testRequired: true, automationRequired: false }
  ], testOnlyInventory);
  const testOnlyStrategy = buildReuseFirstStrategy(testOnlyCoverage);
  assert.equal(testOnlyStrategy.decisions[0]?.action, "reuse-existing-coverage");
  assert.deepEqual(testOnlyStrategy.testGenerationTargetIds, []);
  assert.deepEqual(testOnlyStrategy.automationGenerationTargetIds, []);
});

test("does not count historical or revisionless assets as current coverage", () => {
  const historicalSnapshot: AutomationRepositorySnapshot = {
    ...uiSnapshot,
    revision: undefined,
    automation: [{ ...automation, coverageStatus: "historical" }],
    xrayTests: uiSnapshot.xrayTests.map((item) => ({ ...item, coverageStatus: "historical" }))
  };
  const inventory = buildTestInventory([historicalSnapshot]);
  assert.equal(inventory.automation[0]?.coverageStatus, "unknown");
  const coverage = discoverCoverage([
    { id: "AC-LOGIN", kind: "acceptance-criterion", testRequired: true, automationRequired: true }
  ], inventory);
  assert.equal(coverage.rows[0]?.status, "missing");
  assert.deepEqual(coverage.rows[0]?.xrayTestIds, []);
  assert.deepEqual(coverage.rows[0]?.automationIds, []);
});

test("maps changed implementation and widens regression when a change is unmapped", () => {
  const inventory = buildTestInventory([uiSnapshot]);
  const impact = analyzeRegressionImpact({
    changedFiles: ["src/auth/login.ts", "src/unmapped.ts"],
    changedApiIds: ["API-SEARCH"],
    changedComponentIds: ["LOGIN-FORM"],
    changedBusinessLogicIds: [],
    inventory
  });
  assert.deepEqual(impact.impactedTestIds, ["AUTO-LOGIN-1", "QE-101", "QE-102"]);
  assert.deepEqual(impact.unmatchedChangedFiles, ["src/unmapped.ts"]);
  assert.equal(impact.requiresFullRegression, true);
  assert.ok(impact.impactedRepositories.includes("MBSE-GHEC/mbse-test-automation"));
  const recommendation = buildSmartRegressionRecommendation(inventory, impact, {
    targetEnvironment: "INT",
    art: "REX",
    programIncrement: "PI-26.4"
  });
  assert.deepEqual(recommendation.recommendedRegressionTestIds, ["AUTO-LOGIN-1", "QE-101", "QE-102"]);
  assert.ok(recommendation.recommendedSmokeTestIds.includes("AUTO-LOGIN-1"));
  assert.ok(recommendation.recommendedApiTestIds.includes("QE-102"));
  assert.ok(recommendation.recommendedSuiteIds.includes("SMOKE-UI"));
  assert.ok(recommendation.recommendedSuiteIds.includes("API-SUITE"));
  assert.equal(recommendation.scope, "full-regression");
  assert.equal(recommendation.executionContext?.targetEnvironment, "INT");
  assert.equal(recommendation.executionContext?.art, "REX");
  assert.equal(recommendation.executionContext?.programIncrement, "PI-26.4");
  assert.equal(buildSmartRegressionRecommendation(inventory, impact, { art: "RAM" }).executionContext?.art, "RAM");
});

test("reuse governance blocks missing analysis and duplicate tests, scripts, utilities, and coverage", () => {
  const inventory = buildTestInventory([uiSnapshot]);
  const coverage = discoverCoverage([
    { id: "AC-LOGIN", kind: "acceptance-criterion", testRequired: true, automationRequired: true }
  ], inventory);
  const strategy = buildReuseFirstStrategy(coverage);
  const blocked = validateReuseGovernance({
    analyzed: { repositories: true, frameworks: true, standards: true, pipelines: true, tests: true, automation: true, xray: true, suites: true },
    inventory,
    strategy,
    existingUtilities: ["auth-client"],
    proposedTests: [{ id: "NEW-1", title: "Login accepts a valid account", acceptanceCriteriaIds: ["AC-LOGIN"], scenarioIds: ["SC-LOGIN"] }],
    proposedAutomation: [{ id: "NEW-AUTO-1", path: "src/tests/new-login.spec.ts", source: "duplicate", sourceFingerprint: createHash("sha256").update("duplicate").digest("hex"), utilityRefs: [] }],
    proposedUtilities: ["auth client"],
    proposedRegressionCoverageIds: ["AC-LOGIN", "AC-LOGIN"]
  });
  assert.equal(blocked.decision, "BLOCK");
  assert.ok(blocked.findings.some(({ category }) => category === "duplicate-test"));
  assert.ok(blocked.findings.some(({ category }) => category === "duplicate-automation"));
  assert.ok(blocked.findings.some(({ category }) => category === "duplicate-utility"));
  assert.ok(blocked.findings.some(({ category }) => category === "duplicate-regression-coverage"));
  const incomplete = validateReuseGovernance({
    analyzed: { repositories: false, frameworks: true, standards: true, pipelines: true, tests: true, automation: true, xray: true, suites: true },
    inventory,
    strategy,
    proposedTests: [],
    proposedAutomation: [],
    proposedUtilities: []
  });
  assert.equal(incomplete.decision, "BLOCK");
  assert.ok(incomplete.findings.some(({ id }) => id === "REUSE-ANALYSIS-REPOSITORIES"));
});

test("routes generation through existing-test intelligence and orders the full pipeline", () => {
  const route = selectProgressiveDisclosureRoute({ intent: "generate_test_cases" });
  for (const skill of ["existing-test-intelligence", "github-intelligence", "implementation-intelligence", "coverage-intelligence"] as const) {
    assert.ok(route.selectedSkills.includes(skill));
  }
  assert.ok(route.selectedPromptContracts.includes("coverage-discovery.md"));
  assert.ok(route.selectedPromptContracts.includes("reuse-governance.md"));
  const uiRoute = selectProgressiveDisclosureRoute({ intent: "generate_ui_automation" });
  assert.ok(uiRoute.selectedSkills.includes("xray-intelligence"));
  assert.ok(uiRoute.selectedPromptContracts.includes("xray-repository-intelligence.md"));
  assert.ok(uiRoute.selectedPromptContracts.includes("test-reuse-intelligence.md"));
  const plan = createQualityWorkflowPlan("jira-story");
  assert.deepEqual(validateQualityWorkflowPlan(plan), []);
  const order = plan.stages.map(({ stage }) => stage);
  assert.ok(order.indexOf("implementation-analysis") < order.indexOf("automation-repository-discovery"));
  assert.ok(order.indexOf("automation-repository-discovery") < order.indexOf("framework-intelligence"));
  assert.ok(order.indexOf("pipeline-intelligence") < order.indexOf("existing-test-discovery"));
  assert.ok(order.indexOf("coverage-discovery") < order.indexOf("regression-impact-analysis"));
  assert.ok(order.indexOf("coverage-delta-analysis") < order.indexOf("reuse-first-strategy"));
  assert.ok(order.indexOf("reuse-governance") < order.indexOf("test-case-generation"));
  assert.equal(plan.stages.find(({ stage }) => stage === "test-case-generation")?.condition, "reuse-governance-passed");
  assert.equal(plan.stages.find(({ stage }) => stage === "playwright-generation")?.condition, "ui-candidates-and-reuse-governance-passed");
  assert.ok(order.indexOf("smart-regression-suite-builder") < order.indexOf("execution-recommendation"));
  assert.ok(order.indexOf("smart-regression-suite-builder") < order.indexOf("enterprise-quality-gate"));
  assert.ok(order.indexOf("enterprise-quality-gate") < order.indexOf("execution-recommendation"));
  assert.ok(order.indexOf("execution-recommendation") < order.indexOf("pull-request-creation"));
  assert.ok(order.indexOf("pull-request-creation") < order.indexOf("github-actions-compatibility-validation"));
  assert.ok(order.indexOf("github-actions-compatibility-validation") < order.indexOf("github-actions-execution"));
});

test("persists intelligence outputs under the configured Jira story folder", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "qe-existing-test-intelligence-"));
  try {
    const configPath = join(temporaryRoot, "generation-config.json");
    const paths = resolveJiraGenerationPaths({
      jiraUrl: "https://jira.example.com/browse/QE-700",
      jiraId: "QE-700",
      repositoryName: "quality/platform",
      outputFolder: "artifacts",
      uiGenerationEnabled: false,
      apiGenerationEnabled: false,
      performanceGenerationEnabled: false
    }, configPath);
    const inventory = buildTestInventory([uiSnapshot]);
    const coverage = discoverCoverage([
      { id: "AC-LOGIN", kind: "acceptance-criterion", testRequired: true, automationRequired: true }
    ], inventory);
    const impact = analyzeRegressionImpact({
      changedFiles: ["src/auth/login.ts"],
      changedApiIds: [],
      changedComponentIds: ["LOGIN-FORM"],
      changedBusinessLogicIds: [],
      inventory
    });
    const strategy = buildReuseFirstStrategy(coverage);
    const governance = validateReuseGovernance({
      analyzed: { repositories: true, frameworks: true, standards: true, pipelines: true, tests: true, automation: true, xray: true, suites: true },
      inventory,
      strategy,
      proposedTests: [],
      proposedAutomation: [],
      proposedUtilities: []
    });
    await writeExistingTestIntelligenceForJiraStory(paths, {
      repositories: discoverAutomationRepositories(configuredRepositories, [uiSnapshot]),
      frameworks: analyzeFrameworkIntelligence([uiSnapshot]),
      standards: analyzeRepositoryStandards([uiSnapshot]),
      pipelines: analyzePipelineIntelligence([uiSnapshot]),
      inventory,
      coverage,
      regressionImpact: impact,
      coverageDelta: analyzeCoverageDelta(coverage, ["AC-LOGIN"]),
      reuseStrategy: strategy,
      reuseGovernance: governance,
      executionRecommendation: buildSmartRegressionRecommendation(inventory, impact)
    });
    const saved = JSON.parse(await readFile(join(paths.jiraFolder, "coverage-discovery-model.json"), "utf8")) as { repositoryRevisions: Array<{ repository: string; revision: string }> };
    assert.equal(saved.repositoryRevisions[0]?.revision, "a".repeat(40));
    const bundle = JSON.parse(await readFile(join(paths.jiraFolder, "existing-test-intelligence.json"), "utf8")) as { executionRecommendation: { scope: string } };
    assert.equal(bundle.executionRecommendation.scope, "impacted");
    await readFile(join(paths.jiraFolder, "automation-inventory.json"), "utf8");
    await readFile(join(paths.jiraFolder, "execution-recommendation.json"), "utf8");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});