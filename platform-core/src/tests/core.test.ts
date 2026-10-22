import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { EnvironmentIntelligenceInput, ExistingXrayRepositoryInventory, RequirementCodeMapping, TestDataIntelligenceInput } from "../index.js";

import {
  analyzeCoverage,
  analyzeCoverageIntelligence,
  analyzeApiIntelligence,
  apiContractsFromEndpointDefinitions,
  writeApiIntelligenceArtifact,
  analyzeFailure,
  analyzeRequirements,
  analyzeSourceImpact,
  analyzeTestMaintenance,
  calculateStoryReadiness,
  correlateEvidence,
  assessLocator,
  createQualityWorkflowPlan,
  discoverImplementationSources,
  buildImplementationReconstructionModel,
  evaluateImplementationTrust,
  selectProgressiveDisclosureRoute,
  loadSelectedSkillMetadata,
  loadSelectedPromptContracts,
  createExecutiveSummary,
  generateTestCases,
  redactSensitiveText,
  writeExecutionReport,
  writeCoverageIntelligenceReport,
  writeJsonArtifact,
  validateRequirementAnalysis,
  validateRequirementsAgainstCode,
  validateTraceability,
  validateTestCases,
  validateQualityWorkflowPlan,
  selectTests,
  selectAutomationStrategies,
  writeRequirementCodeMappings,
  writeRequirementAnalysis,
  loadGenerationConfig,
  resolveJiraGenerationPaths,
  createJiraGenerationLayout,
  createCanonicalXrayImport,
  writeXrayTestIssueLinks,
  createJiraTestCaseRoutingPlan,
  writeGeneratedFile,
  writeRequirementAnalysisForJiraStory,
  writeScenarioAnalysisForJiraStory,
  writeTestCasesForJiraStory,
  writeExecutionSummaryForJiraStory,
  writeRequirementCodeMappingsForJiraStory,
  writeUnifiedEvidenceForJiraStory,
  writeImplementationSourceForJiraStory,
  writeImplementationReconstructionForJiraStory,
  writeImplementationTrustForJiraStory,
  writeStoryReadinessForJiraStory,
  writeXrayImportArtifacts,
  discoverApiContracts,
  normalizeOpenApiDocument,
  writeJiraTestCaseIssueLinks,
  validateGenerationConfig,
  buildApplicationDiscoveryIntelligence,
  validateDiscovery,
  analyzeExistingXrayRepository,
  analyzeTestReuse,
  buildEnvironmentIntelligence,
  buildTestDataIntelligence,
  loadGovernanceConfig,
  validateGovernanceConfig,
  validateRequirementsBeforeAnalysis,
  validateGeneratedTests,
  validateAutomationScripts,
  validatePerformancePlan,
  detectHallucinations,
  validateDataPrivacy,
  evaluateEnterpriseQualityGate,
  writeGovernanceReport,
  coveragePolicyFromGovernance,
  apiPolicyFromGovernance
} from "../index.js";

test("validates a complete requirement analysis", () => {
  const result = validateRequirementAnalysis({
    schemaVersion: "1.0.0",
    analysisId: "RA-PROJ-1",
    story: { key: "PROJ-1", summary: "Sign in", description: "User signs in." },
    acceptanceCriteria: [{ id: "AC-1", description: "Valid user reaches dashboard." }],
    scenarios: [{
      id: "FS-1",
      category: "functional",
      title: "Valid sign in",
      objective: "Verify sign in.",
      priority: "critical",
      preconditions: [],
      steps: [{ sequence: 1, action: "Sign in", expectedOutcome: "Dashboard is shown" }],
      expectedResult: "Dashboard is shown",
      acceptanceCriteriaIds: ["AC-1"]
    }]
  });
  assert.equal(result.valid, true);
});

test("loads central governance config and blocks unsafe requirements, tests, scripts, performance, hallucinations, and privacy", async () => {
  const configPath = fileURLToPath(new URL("../../../governance-config.json", import.meta.url));
  const config = await loadGovernanceConfig(configPath);
  const rawGovernanceConfig = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
  assert.equal(config.qualityGates.minimumCoveragePercent, 95);
  assert.equal(config.qualityGates.implementationTrust?.minimumScore, 85);
  assert.equal(config.performanceGuardrails.blockProduction, true);
  assert.equal(coveragePolicyFromGovernance(config).minRequirementCoveragePercent, config.qualityGates.minimumCoveragePercent);
  assert.equal(apiPolicyFromGovernance(config).minContractCoveragePercent, config.qualityGates.minimumContractCoveragePercent);
  const legacyGovernanceConfig = JSON.parse(JSON.stringify(rawGovernanceConfig)) as Record<string, unknown>;
  delete (legacyGovernanceConfig.qualityGates as Record<string, unknown>).implementationTrust;
  assert.equal(validateGovernanceConfig(legacyGovernanceConfig).qualityGates.implementationTrust, undefined);
  assert.throws(() => validateGovernanceConfig({ ...rawGovernanceConfig, qualityGate: {} }), /Unknown governance configuration fields/);
  const rawStory = { key: "GOV-91", summary: "Access account", description: "A customer can access an account." };
  const rawAcceptanceCriteria = [{ id: "AC-1", description: "The account behavior is TBD." }];
  const requirementReport = validateRequirementsBeforeAnalysis(config, {
    storyKey: rawStory.key,
    summary: rawStory.summary,
    description: rawStory.description,
    acceptanceCriteria: rawAcceptanceCriteria,
    businessRules: [],
    confidence: 0.4,
    businessContext: {},
    dependencies: [{ id: "DEP-1", available: false }],
    duplicateStories: [{ storyKey: "GOV-90", confidence: 0.95, summary: "Access account" }],
    conflictingRequirementIds: [["FR-1", "FR-2"]]
  });
  assert.equal(requirementReport.status, "BLOCK");
  assert.ok(requirementReport.findings.some((item) => item.category === "ambiguity"));
  assert.ok(requirementReport.findings.some((item) => item.category === "duplicate-story"));
  const analysis = analyzeRequirements({ story: rawStory, acceptanceCriteria: rawAcceptanceCriteria });
  const mappings: RequirementCodeMapping[] = [{
    id: "RCM-91",
    storyKey: analysis.story.key,
    acceptanceCriteriaId: "AC-1",
    changeType: "modified",
    changeAreas: ["business-logic"],
    repository: "quality/governance",
    branch: "feature/GOV-91",
    commit: "abc123",
    filePath: "src/account.ts",
    changeSummary: "Implements account access."
  }];
  const baseCase = generateTestCases(analysis, mappings)[0]!;
  const duplicateTest = { ...baseCase, id: "TC-2", expectedResult: "OK" };
  const testReport = validateGeneratedTests(config, {
    analysis,
    testCases: [{ ...baseCase, expectedResult: "OK" }, duplicateTest],
    assertionReferences: {},
    coveredRiskAcceptanceCriteriaIds: []
  });
  assert.equal(testReport.status, "BLOCK");
  assert.ok(testReport.findings.some((item) => item.category === "duplicate-test"));
  assert.ok(testReport.findings.some((item) => item.category === "missing-assertion"));
  assert.ok(testReport.findings.some((item) => item.category === "weak-expected-result"));

  const scriptSource = "import { test } from '@playwright/test'; page.waitForTimeout(1000); const password='prod-secret';";
  const scriptReport = validateAutomationScripts(config, analysis.story.key, [
    { id: "SCR-1", path: "Bad Script.ts", source: scriptSource, strategy: "ui", frameworkCompliant: false, usesPageObject: false, reusesUtility: false, assertionCount: 0, locatorValues: ["#submit"] },
    { id: "SCR-2", path: "Bad Script.ts", source: scriptSource, strategy: "ui", frameworkCompliant: false, usesPageObject: false, reusesUtility: false, assertionCount: 0, locatorValues: ["#submit"] }
  ]);
  assert.equal(scriptReport.status, "BLOCK");
  assert.ok(scriptReport.findings.some((item) => item.category === "security"));
  assert.ok(scriptReport.findings.some((item) => item.category === "duplicate-script"));
  assert.ok(scriptReport.findings.some((item) => item.category === "duplicate-locator"));

  const performanceReport = validatePerformancePlan(config, [{ id: "PERF-1", environment: "PROD", users: config.performanceGuardrails.maximumUsers + 1,
    durationSeconds: config.performanceGuardrails.maximumDurationSeconds + 1, rampRate: config.performanceGuardrails.maximumRampRate + 1,
    requestRate: config.performanceGuardrails.maximumRequestRate + 1, testSize: config.performanceGuardrails.maximumTestSize + 1,
    parallelExecutions: config.performanceGuardrails.maximumParallelExecutions + 1 }]);
  assert.equal(performanceReport.status, "BLOCK");

  const hallucinationReport = detectHallucinations(config, {
    storyKey: analysis.story.key,
    requirementAnalysis: analysis,
    apiOperations: [],
    references: [{ artifactId: "TC-1", type: "api", reference: "GET /not-real", evidenceReferences: ["AC-1"] }]
  });
  assert.equal(hallucinationReport.status, "BLOCK");
  assert.equal(hallucinationReport.confidenceScore, 0);
  const invalidLocatorReport = detectHallucinations(config, {
    storyKey: analysis.story.key,
    requirementAnalysis: analysis,
    apiOperations: [],
    applicationDiscovery: {
      schemaVersion: "1.0.0",
      applicationId: "APP-GOV",
      applicationName: "Governed App",
      baseUrl: "https://app.example.test",
      pages: [{ id: "page-1", title: "Account", route: "/account", status: "discovered", menus: [], forms: [], tables: [], buttons: [{ id: "button-1", name: "Submit", visible: true, enabled: true }], validations: [] }],
      navigationPaths: []
    },
    references: [{
      artifactId: "SCR-LOCATOR-1",
      type: "locator",
      reference: "button-1",
      targetElementId: "button-1",
      evidenceReferences: ["button-1"],
      locatorCandidate: { strategy: "xpath", value: "/html/body/button[1]", unique: true }
    }]
  });
  assert.equal(invalidLocatorReport.status, "BLOCK");
  assert.ok(invalidLocatorReport.findings.some((item) => item.category === "invalid-locator"));

  const privacyReport = validateDataPrivacy(config, analysis.story.key, [
    { artifactId: "REQ-1", artifactType: "requirement", content: "customer email user@example.test" },
    { artifactId: "REPORT-1", artifactType: "report", content: "password=secret123 production customer data", productionData: true }
  ]);
  assert.equal(privacyReport.status, "BLOCK");
  assert.ok(privacyReport.sanitizedArtifacts[0]?.content.includes(config.privacyGuardrails.replacementText));
  assert.equal(privacyReport.sanitizedArtifacts[1]?.content.includes("secret123"), false);

  const coverageReport = analyzeCoverageIntelligence({
    analysis,
    codeValidation: validateRequirementsAgainstCode(analysis, []),
    testCases: [],
    automations: [],
    codePaths: []
  });
  const qualityGateInput = {
    storyKey: analysis.story.key,
    requirementReport,
    testReport,
    automationReport: scriptReport,
    performanceReport,
    hallucinationReport,
    privacyReport,
    coverageReport,
    readinessReport: calculateStoryReadiness(analysis.story.key, { requirementConfidence: 0, implementationConfidence: 0, apiConfidence: null, xrayCoverageConfidence: 0, automationConfidence: 0 }, config.qualityGates.minimumReadinessScore),
    securityViolationCount: 1,
    duplicateTestCount: 1,
    criticalGovernanceFindingCount: 1
  };
  const readiness = evaluateEnterpriseQualityGate(config, qualityGateInput);
  assert.equal(readiness.decision, "BLOCK");
  assert.equal(readiness.executionReady, false);
  assert.ok(readiness.gates.some((gate) => gate.id === "coverage" && !gate.passed));
  const reconstructionReadiness = evaluateEnterpriseQualityGate(config, {
    ...qualityGateInput,
    implementationReconstructionRequired: true
  });
  assert.ok(reconstructionReadiness.gates.some((gate) => gate.id === "implementation-trust" && !gate.passed));
  assert.ok(reconstructionReadiness.findings.some((item) => item.category === "implementation-trust"));

  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-governance-report-"));
  try {
    await writeGovernanceReport(readiness, outputDirectory, "execution-readiness-report.json");
    assert.equal(JSON.parse(await readFile(join(outputDirectory, "execution-readiness-report.json"), "utf8")).decision, "BLOCK");
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("builds application discovery inventories from observed pages and validates legacy payloads", () => {
  const legacy = {
    schemaVersion: "1.0.0" as const,
    applicationId: "APP-1",
    applicationName: "Sample Application",
    baseUrl: "https://app.example.com",
    pages: [{ id: "page-login", title: "Sign in", route: "/login", status: "discovered" as const, menus: [], forms: [], tables: [], buttons: [], validations: [] }],
    navigationPaths: []
  };
  assert.deepEqual(validateDiscovery(legacy), []);
  const discovery = {
    ...legacy,
    featureBranch: { repository: "quality/app", branch: "feature/APP-1-login", commit: "abc123" },
    requirementIds: ["FR-1"],
    pages: [{
      ...legacy.pages[0]!,
      forms: [{ id: "form-login", name: "Sign in", fields: [{ id: "field-email", name: "Email", visible: true, enabled: true, fieldType: "email" as const, required: true, validationIds: ["val-email"] }] }],
      tables: [{ id: "table-users", name: "Users", columns: [{ id: "col-email", label: "Email", dataType: "email" }], paginationSupported: true }],
      buttons: [{ id: "button-submit", name: "Sign in", visible: true, enabled: true }],
      dialogs: [{ id: "dialog-consent", name: "Consent", title: "Privacy notice", visible: false, enabled: true, dismissButtonIds: ["button-close"] }]
    }],
    navigationPaths: [{ id: "nav-login", sourcePageId: "page-login", targetPageId: "page-login", triggerElementId: "button-submit", conditions: ["Form is valid"] }],
    userJourneys: [{ id: "JOURNEY-1", name: "Sign in", requirementIds: ["FR-1"], pageIds: ["page-login"], navigationPathIds: ["nav-login"], outcome: "User is authenticated" }],
    workflows: [{ id: "FLOW-1", name: "Account access", journeyIds: ["JOURNEY-1"] }]
  };
  const model = buildApplicationDiscoveryIntelligence(discovery);
  assert.deepEqual(model.requirementIds, ["FR-1"]);
  assert.deepEqual(model.screenInventory.map((screen) => screen.route), ["/login"]);
  assert.ok(model.componentInventory.some((component) => component.type === "dialog" && component.id === "dialog-consent"));
  assert.ok(model.componentInventory.some((component) => component.type === "table-column" && component.id === "col-email"));
  assert.deepEqual(model.navigationModel.workflows[0]?.journeyIds, ["JOURNEY-1"]);
  assert.match(JSON.stringify(model), /feature\/APP-1-login/);
  assert.throws(() => buildApplicationDiscoveryIntelligence({
    ...discovery,
    userJourneys: [{ ...discovery.userJourneys[0]!, pageIds: ["missing-page"] }]
  }), /unknown page/);
  assert.throws(() => buildApplicationDiscoveryIntelligence({
    ...discovery,
    pages: [{ ...discovery.pages[0]!, buttons: [{ id: "form-login", name: "Conflict", visible: true, enabled: true }] }]
  }), /Duplicate discovered component identifier/);
});

test("reuses exact Xray scenarios, distinguishes partial matches, and recommends only uncovered work", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-92", summary: "Search accounts", description: "Users search accounts and manage empty results." },
    acceptanceCriteria: [
      { id: "AC-1", description: "A search returns matching accounts." },
      { id: "AC-2", description: "An empty search returns no results." },
      { id: "AC-3", description: "An unavailable search service reports an error." }
    ]
  });
  const [reusableScenario, partialScenario, missingScenario] = analysis.scenarios;
  assert.ok(reusableScenario && partialScenario && missingScenario);
  const inventory: ExistingXrayRepositoryInventory = {
    repositories: [],
    folders: [],
    tests: [
      {
        issueKey: "QE-9201",
        issueUrl: "https://jira.example.com/browse/QE-9201",
        summary: reusableScenario.title,
        status: "active",
        repositoryPath: "AI_Generated_tests",
        folderPath: "Accounts/Search",
        acceptanceCriteriaIds: ["AC-1"],
        scenarioIds: [reusableScenario.id],
        automationPaths: ["UI/Scripts/search-accounts.spec.ts"]
      },
      {
        issueKey: "QE-9202",
        issueUrl: "https://jira.example.com/browse/QE-9202",
        summary: reusableScenario.title,
        status: "active",
        repositoryPath: "AI_Generated_tests",
        folderPath: "Accounts/Search",
        acceptanceCriteriaIds: ["AC-1"],
        scenarioIds: [reusableScenario.id],
        automationPaths: []
      },
      {
        issueKey: "QE-9203",
        issueUrl: "https://jira.example.com/browse/QE-9203",
        summary: "Search accounts",
        status: "active",
        repositoryPath: "AI_Generated_tests",
        folderPath: "Accounts/Search",
        acceptanceCriteriaIds: ["AC-2"],
        scenarioIds: [],
        automationPaths: []
      }
    ],
    executions: [{ issueKey: "QE-9201", executionKey: "EXEC-1", result: "passed", executedAt: "2026-10-01T00:00:00Z" }],
    historicalCoverage: [{ observedAt: "2026-09-30T00:00:00Z", acceptanceCriteriaIds: ["AC-3"], testIssueKeys: ["QE-9299"] }]
  };
  const repositoryAnalysis = analyzeExistingXrayRepository(analysis, inventory);
  const reuse = analyzeTestReuse(analysis, inventory, repositoryAnalysis);

  assert.equal(repositoryAnalysis.repositories[0]?.path, "AI_Generated_tests");
  assert.equal(repositoryAnalysis.folders[0]?.path, "Accounts/Search");
  assert.equal(repositoryAnalysis.duplicateGroups.length, 1);
  assert.deepEqual(repositoryAnalysis.coverageDelta.map((row) => row.status), ["covered", "covered", "historical-only"]);
  assert.deepEqual(reuse.reusableScenarioIds, [reusableScenario.id]);
  assert.deepEqual(reuse.scenarioFindings.find((finding) => finding.scenarioId === reusableScenario.id)?.matchingAutomationPaths, ["UI/Scripts/search-accounts.spec.ts"]);
  assert.deepEqual(reuse.partialReuseScenarioIds, [partialScenario.id]);
  assert.deepEqual(reuse.missingScenarioIds, [missingScenario.id]);
  assert.deepEqual(reuse.missingAcceptanceCriteriaIds, ["AC-3"]);
  assert.deepEqual(reuse.newTestRecommendations.map((item) => item.action), ["extend-existing", "create"]);
  assert.deepEqual(inventory.folders, [], "analysis must not mutate the caller's Xray inventory");

  const mappings: RequirementCodeMapping[] = analysis.acceptanceCriteria.map((criterion, index) => ({
    id: `RCM-${index + 1}`,
    storyKey: analysis.story.key,
    acceptanceCriteriaId: criterion.id,
    changeType: "modified",
    changeAreas: ["business-logic"],
    repository: "quality/accounts",
    branch: "feature/QE-92-search",
    commit: "abc123",
    filePath: "src/search.ts",
    changeSummary: `Implements ${criterion.id}`
  }));
  const generated = generateTestCases(analysis, mappings, undefined, reuse);
  assert.deepEqual(generated.map((testCase) => testCase.traceability.scenarioIds[0]), [partialScenario.id, missingScenario.id]);
  const automationAndSuiteInventory: ExistingXrayRepositoryInventory = {
    ...inventory,
    tests: [],
    executions: [],
    automationAssets: [{
      id: "AUT-1",
      title: missingScenario.title,
      path: "API/Scripts/search-service-unavailable.spec.ts",
      strategy: "api",
      active: true,
      acceptanceCriteriaIds: ["AC-3"],
      scenarioIds: [missingScenario.id]
    }],
    regressionSuites: [{
      id: "REG-1",
      name: "Search regression",
      testIssueKeys: [],
      acceptanceCriteriaIds: ["AC-2"],
      scenarioIds: [partialScenario.id]
    }]
  };
  const automationReuse = analyzeTestReuse(analysis, automationAndSuiteInventory);
  assert.equal(automationReuse.scenarioFindings.find((finding) => finding.scenarioId === missingScenario.id)?.decision, "reusable");
  assert.equal(automationReuse.newTestRecommendations.find((item) => item.scenarioId === missingScenario.id)?.action, "link-existing");
  assert.equal(automationReuse.scenarioFindings.find((finding) => finding.scenarioId === partialScenario.id)?.decision, "partial-reuse");
  assert.deepEqual(automationReuse.coverageDelta.map((row) => row.status), ["missing", "covered", "covered"]);
  assert.deepEqual(automationReuse.scenarioFindings.find((finding) => finding.scenarioId === missingScenario.id)?.exactAutomationPaths, ["API/Scripts/search-service-unavailable.spec.ts"]);
  assert.deepEqual(automationReuse.scenarioFindings.find((finding) => finding.scenarioId === partialScenario.id)?.regressionSuiteNames, ["Search regression"]);
  const crossStoryAnalysis = analyzeTestReuse(analysis, {
    ...inventory,
    tests: [{
      ...inventory.tests[0]!,
      issueKey: "OTHER-100",
      sourceStoryKey: "OTHER-99",
      acceptanceCriteriaIds: ["AC-1"],
      scenarioIds: []
    }],
    executions: [],
    historicalCoverage: [{ observedAt: "2026-10-01T00:00:00Z", sourceStoryKey: "OTHER-99", acceptanceCriteriaIds: ["AC-1"], testIssueKeys: ["OTHER-100"] }]
  });
  assert.equal(crossStoryAnalysis.scenarioFindings.find((finding) => finding.scenarioId === reusableScenario.id)?.decision, "missing");
  assert.equal(crossStoryAnalysis.coverageDelta[0]?.status, "missing");
});

test("models supported environments and reports configuration deltas without exposing secrets", () => {
  const inputs: EnvironmentIntelligenceInput[] = [
    {
      name: "DEV",
      baseUrl: "https://dev.example.com",
      apiBaseUrl: "https://api.dev.example.com",
      authenticationPatterns: ["sso", "bearer"],
      environmentVariables: [
        { name: "API_TOKEN", required: true, secret: true, configured: true },
        { name: "FEATURE_SET", required: false, secret: false, configured: true }
      ],
      apiEndpoints: ["GET /accounts", "POST /accounts"],
      featureToggles: { newSearch: true },
      configuration: { timeoutMs: 10000, API_TOKEN: "dev-sensitive-value" }
    },
    {
      name: "QA",
      baseUrl: "https://qa.example.com",
      apiBaseUrl: "https://api.qa.example.com",
      authenticationPatterns: ["sso"],
      environmentVariables: [
        { name: "API_TOKEN", required: true, secret: true, configured: true },
        { name: "FEATURE_SET", required: false, secret: false, configured: false }
      ],
      apiEndpoints: ["GET /accounts"],
      featureToggles: { newSearch: false },
      configuration: { timeoutMs: 20000, API_TOKEN: "qa-sensitive-value" }
    }
  ];
  const model = buildEnvironmentIntelligence(inputs);
  assert.deepEqual(model.environments.map((environment) => environment.name), ["DEV", "QA"]);
  assert.ok(model.missingEnvironments.includes("PROD"));
  assert.equal(model.configurationDifferences.find((item) => item.key === "timeoutMs")?.differs, true);
  assert.equal(model.configurationDifferences.find((item) => item.key === "featureToggle:newSearch")?.differs, true);
  assert.equal(model.configurationDifferences.find((item) => item.key === "API_TOKEN")?.environments[0]?.redacted, true);
  assert.equal(JSON.stringify(model).includes("dev-sensitive-value"), false);
  assert.equal(JSON.stringify(model).includes("qa-sensitive-value"), false);
  assert.equal(JSON.stringify(model).includes("FEATURE_SET"), true);
  assert.throws(() => buildEnvironmentIntelligence([inputs[0]!, inputs[0]!]), /Duplicate execution environment/);
});

test("derives test data from UI, API, and database evidence without generating secrets", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-93", summary: "Sign in to an account", description: "A user signs in to an account." },
    acceptanceCriteria: [{ id: "AC-1", description: "A valid user can access the account." }]
  });
  const operation = normalizeOpenApiDocument({
    paths: { "/accounts": { post: {
      operationId: "createAccountSession",
      requestBody: { required: true, content: { "application/json": { schema: {
        type: "object",
        required: ["accountId", "password"],
        properties: { accountId: { type: "string" }, password: { type: "string" } }
      } } } },
      responses: { "200": { description: "Signed in" } }
    } } }
  }, "https://api.example.com/openapi.json", "openapi")[0]!;
  const applicationDiscovery = buildApplicationDiscoveryIntelligence({
    schemaVersion: "1.0.0",
    applicationId: "APP-1",
    applicationName: "Accounts",
    baseUrl: "https://app.example.com",
    requirementIds: ["FR-1"],
    pages: [{
      id: "page-login",
      title: "Sign in",
      route: "/login",
      status: "discovered",
      menus: [],
      forms: [{ id: "form-login", name: "Sign in", fields: [
        { id: "field-email", name: "email", visible: true, enabled: true, fieldType: "email", required: true, validationIds: [] },
        { id: "field-password", name: "password", visible: true, enabled: true, fieldType: "password", required: true, validationIds: [] }
      ] }],
      tables: [],
      buttons: [],
      validations: []
    }],
    navigationPaths: [],
    userJourneys: [{ id: "JOURNEY-1", name: "Sign in", requirementIds: ["FR-1"], pageIds: ["page-login"], navigationPathIds: [], outcome: "Account is shown" }]
  });
  const input: TestDataIntelligenceInput = {
    requirementAnalysis: analysis,
    applicationDiscovery,
    apiOperations: [operation],
    apiMappings: [{ operationId: "createAccountSession", requirementIds: ["FR-1"], acceptanceCriteriaIds: ["AC-1"], evidence: ["API operation serves sign-in"] }],
    databaseDependencies: [{
      id: "DB-1",
      name: "Account session store",
      acceptanceCriteriaIds: ["AC-1"],
      fields: [{ name: "accountId", dataType: "string", required: true }],
      setupStrategy: "Create an isolated synthetic account through the fixture API.",
      cleanupStrategy: "Delete the account session through the fixture API."
    }],
    reusableDataSources: [{ id: "DATA-SAFE-1", path: "test-data/users.json#customer", fieldNames: ["email"], safeForReuse: true }],
    allowSyntheticData: true
  };
  const model = buildTestDataIntelligence(input);
  const dataSet = model.automationDataSets[0]!;
  assert.deepEqual(model.requirements.map((requirement) => requirement.fieldName).sort(), ["accountId", "email", "password"]);
  assert.equal(dataSet.values.find((value) => value.fieldName === "email")?.source, "reusable");
  assert.equal(dataSet.values.find((value) => value.fieldName === "accountId")?.source, "synthetic");
  assert.equal(dataSet.values.find((value) => value.fieldName === "password")?.source, "environment-reference");
  assert.equal(dataSet.values.find((value) => value.fieldName === "password")?.value, undefined);
  assert.match(dataSet.values.find((value) => value.fieldName === "password")?.reference ?? "", /^TEST_DATA_/);
  assert.equal(dataSet.setupStrategies.length, 1);
  assert.equal(dataSet.cleanupStrategies.length, 1);
  const codeMappings: RequirementCodeMapping[] = [{
    id: "RCM-1",
    storyKey: analysis.story.key,
    acceptanceCriteriaId: "AC-1",
    changeType: "modified",
    changeAreas: ["api"],
    repository: "quality/accounts",
    branch: "feature/QE-93-sign-in",
    commit: "def456",
    filePath: "src/auth.ts",
    changeSummary: "Validates account sign-in data."
  }];
  const testCases = generateTestCases(analysis, codeMappings, undefined, undefined, model);
  assert.deepEqual(testCases[0]?.traceability.testDataSetIds, [dataSet.id]);
});

test("analyzes Jira acceptance criteria into downstream-compatible scenarios", async () => {
  const input = {
    story: {
      key: "QE-42",
      summary: "User signs in",
      description: "An authorized user signs in."
    },
    jiraContext: {
      sourceUrl: "https://jira.example.atlassian.net/browse/QE-42",
      retrievedAt: "2026-10-08T08:00:00Z",
      metadata: { priority: "High", sprint: 12 },
      linkedDefects: [{ key: "QE-40", summary: "Login failure", status: "Closed" }],
      commentReferences: [{ id: "comment-1", updatedAt: "2026-10-07T15:30:00Z" }],
      relatedIssues: [
        { key: "QE-41", summary: "Parent story", status: "In Progress", relationship: "parent-story" as const },
        { key: "QE-43", summary: "Child story", status: "Open", relationship: "child-story" as const },
        { key: "QE-44", summary: "Authentication epic", status: "In Progress", relationship: "epic" as const },
        { key: "QE-45", summary: "Login enhancement", status: "Done", relationship: "enhancement" as const },
        { key: "QE-46", summary: "Related story", status: "Done", relationship: "linked-story" as const },
        { key: "QE-47", summary: "Prior defect", status: "Closed", relationship: "defect" as const }
      ]
    },
    acceptanceCriteria: [
      {
        id: "AC-1",
        description: "Given an active account, when valid credentials are submitted, then the dashboard is displayed."
      },
      { id: "AC-2", description: "Invalid credentials are rejected." },
      { id: "AC-3", description: "Password must be between 12 and 64 characters." }
    ]
  };
  const analysis = analyzeRequirements(input);
  const validation = validateRequirementAnalysis(analysis);

  assert.equal(analysis.analysisId, "RA-QE-42");
  assert.deepEqual(analysis.jiraContext?.linkedDefects.map((defect) => defect.key), ["QE-40"]);
  assert.deepEqual(analysis.jiraContext?.commentReferences.map((comment) => comment.id), ["comment-1"]);
  assert.deepEqual(analysis.jiraContext?.relatedIssues?.map((issue) => issue.relationship), [
    "parent-story", "child-story", "epic", "enhancement", "linked-story", "defect"
  ]);
  assert.equal(validation.valid, true);
  assert.deepEqual(analysis.functionalRequirements?.map((requirement) => requirement.acceptanceCriteriaIds), [
    ["AC-1"], ["AC-2"], ["AC-3"]
  ]);
  assert.deepEqual(analysis.businessRules?.map((rule) => rule.acceptanceCriteriaIds), [["AC-3"]]);
  assert.deepEqual(analysis.validationRules?.map((rule) => rule.acceptanceCriteriaIds), [["AC-2"], ["AC-3"]]);
  assert.deepEqual(analysis.implicitRequirements, []);
  assert.deepEqual(analysis.assumptions, []);
  assert.deepEqual(analysis.scenarios.map((scenario) => scenario.category), ["functional", "negative", "validation", "boundary", "validation"]);
  assert.deepEqual(analysis.scenarios[0]?.preconditions, ["an active account"]);
  assert.equal(analysis.automationCandidates?.length, analysis.scenarios.length);
  assert.deepEqual(analyzeRequirements(input), analysis);

  const codeMappings = analysis.acceptanceCriteria.map((criterion, index) => ({
    id: `RCM-${index + 1}`,
    storyKey: analysis.story.key,
    acceptanceCriteriaId: criterion.id,
    changeType: "modified" as const,
    changeAreas: ["business-logic" as const],
    repository: "quality/platform",
    branch: "feature/QE-42-login",
    pullRequest: "https://ghe.example/pulls/42",
    commit: "abc123def456",
    filePath: "src/auth/login.ts",
    changeSummary: `Implementation for ${criterion.id}`
  }));
  const generatedTestCases = generateTestCases(analysis, codeMappings);
  assert.deepEqual(validateTestCases(generatedTestCases), []);
  assert.deepEqual(generatedTestCases.map((testCase) => testCase.traceability.scenarioIds), [
    ["FS-1"], ["NS-1"], ["VS-1"], ["BS-1"], ["VS-2"]
  ]);
  assert.ok(generatedTestCases.every((testCase) => testCase.traceability.codeReferences.length > 0));
  assert.throws(() => generateTestCases(analysis, []), /no implementation code mapping/);

  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-analysis-"));
  try {
    await writeRequirementAnalysis(analysis, outputDirectory);
    await writeRequirementCodeMappings(analysis, codeMappings, outputDirectory);
    const saved = JSON.parse(await readFile(join(outputDirectory, "requirement-analysis.json"), "utf8"));
    const savedMappings = JSON.parse(await readFile(join(outputDirectory, "requirement-code-mapping.json"), "utf8"));
    assert.deepEqual(saved, analysis);
    assert.deepEqual(savedMappings, codeMappings);
  } finally {
    await rm(outputDirectory, { recursive: true });
  }
});

test("recognizes explicit validation, security, and regression scenario language", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-56", summary: "Review security", description: "Preserve existing behavior." },
    acceptanceCriteria: [
      { id: "AC-1", description: "The email format must be validated." },
      { id: "AC-2", description: "Only users with the administrator role may access the page." },
      { id: "AC-3", description: "Existing regression behavior remains unchanged." }
    ]
  });
  const categories = new Set(analysis.scenarios.map((scenario) => scenario.category));
  assert.equal(categories.has("validation"), true);
  assert.equal(categories.has("security"), true);
  assert.equal(categories.has("regression"), true);
});

test("generates authorization and integration scenarios from explicit acceptance criteria", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-58", summary: "Protect and connect records", description: "The system processes account records." },
    acceptanceCriteria: [
      { id: "AC-1", description: "Only users with the administrator role may access account settings." },
      { id: "AC-2", description: "The order service sends the payment event to the external billing service." }
    ]
  });
  const categories = analysis.scenarios.map((scenario) => scenario.category);
  assert.ok(categories.includes("authorization"));
  assert.ok(categories.includes("security"));
  assert.ok(categories.includes("integration"));
});

test("classifies explicit non-functional and risk requirements without inventing assumptions", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-57", summary: "Protect account data", description: "The service must remain available." },
    acceptanceCriteria: [
      { id: "AC-1", description: "Login response time must remain under 500 ms." },
      { id: "AC-2", description: "Sensitive account data must be encrypted." }
    ]
  });
  assert.deepEqual(analysis.nonFunctionalRequirements?.map((item) => item.id), ["NFR-1", "NFR-2"]);
  assert.equal(analysis.risks?.[0]?.acceptanceCriteriaIds[0], "AC-2");
  assert.deepEqual(analysis.assumptions, []);
  assert.deepEqual(analysis.implicitRequirements, []);
  assert.deepEqual(analysis.functionalRequirements, []);
  assert.equal(validateRequirementAnalysis(analysis).valid, true);
});

test("rejects test cases without traceability", () => {
  const errors = validateTestCases([{
    id: "TC-1",
    version: 1,
    title: "Sign in",
    priority: "high",
    scenarioType: "functional",
    preconditions: [],
    steps: [{ sequence: 1, action: "Sign in", expectedOutcome: "Dashboard is shown" }],
    expectedResult: "Dashboard is shown",
    traceability: { storyKey: "PROJ-1", acceptanceCriteriaIds: [], scenarioIds: ["FS-1"], codeReferences: [] },
    status: "approved"
  }]);
  assert.ok(errors.some((error) => error.includes("Acceptance Criterion")));
});

test("enforces locator governance", () => {
  const stable = assessLocator({
    strategy: "getByTestId",
    value: "login-submit",
    unique: true,
    documentedContract: true
  });
  const brittle = assessLocator({
    strategy: "xpath",
    value: "/html/body/div[1]",
    unique: true
  });
  assert.equal(stable.approved, true);
  assert.equal(brittle.approved, false);
});

test("redacts secrets before reporting", () => {
  const token = "sample.token";
  const password = "sample-password";
  const redacted = redactSensitiveText(`Authorization: Bearer ${token} password=${password}`);
  assert.equal(redacted.includes(token), false);
  assert.equal(redacted.includes(password), false);
});

test("writes sanitized execution reports", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-report-"));
  try {
    await writeExecutionReport({
      executionId: "RUN-1",
      revision: "abc123",
      environment: "test",
      startedAt: "2026-10-07T08:00:00Z",
      completedAt: "2026-10-07T08:00:01Z",
      status: "failed",
      results: [{
        id: "RES-1",
        testId: "TC-1",
        automationId: "AUT-1",
        status: "failed",
        durationMs: 1000,
        error: "password=sample-password",
        artifacts: []
      }]
    }, outputDirectory);
    const summary = await readFile(join(outputDirectory, "execution-summary.json"), "utf8");
    const html = await readFile(join(outputDirectory, "index.html"), "utf8");
    assert.equal(summary.includes("sample-password"), false);
    assert.equal(html.includes("RUN-1"), true);
  } finally {
    await rm(outputDirectory, { recursive: true });
  }
});

test("creates an evidence-based executive summary from execution, coverage, and traceability", () => {
  const coverage = analyzeCoverage(
    [{ id: "FR-1", priority: "high", testCaseIds: ["TC-1"] }],
    [{ id: "TC-1", automationIds: ["AUT-1"] }],
    [{ id: "AUT-1", result: "failed" }]
  );
  const summary = createExecutiveSummary({
    storyKey: "QE-60",
    execution: {
      executionId: "RUN-60",
      revision: "abc123",
      environment: "test",
      startedAt: "2026-10-09T08:00:00Z",
      completedAt: "2026-10-09T08:01:00Z",
      status: "failed",
      results: [{ id: "RES-1", testId: "TC-1", automationId: "AUT-1", status: "failed", durationMs: 1000, artifacts: [] }]
    },
    coverage,
    traceability: { valid: false, orphanEntityIds: ["REQ-1"], invalidLinkIds: [], brokenChainIds: [] },
    confirmedProductDefectCount: 0,
    xray: {
      testsCreated: 2,
      importArtifactLocation: "generated-test-cases/QE-60/xray/xray-import.json",
      automationLinks: [{ xrayTestId: "[QE-60][AI-01]", automationId: "AUT-1", scriptPath: "API/Scripts/status.spec.ts" }]
    }
  });
  assert.equal(summary.failedTests, 1);
  assert.equal(summary.traceabilityValid, false);
  assert.deepEqual(summary.traceabilityIssues, ["Orphan entity: REQ-1"]);
  assert.match(summary.summary, /overall risk is critical/);
  assert.equal(summary.xrayTestsCreated, 2);
  assert.match(summary.xrayImportArtifactLocation ?? "", /xray-import\.json/);
  assert.equal(summary.xrayAutomationLinks[0]?.scriptPath, "API/Scripts/status.spec.ts");
});

test("writes sanitized JSON artifacts without allowing path traversal", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-artifact-"));
  try {
    await writeJsonArtifact({ token: "sample-token", items: [{ password: "sample-password" }] }, outputDirectory, "impact-analysis.json");
    const saved = await readFile(join(outputDirectory, "impact-analysis.json"), "utf8");
    assert.equal(saved.includes("sample-token"), false);
    assert.equal(saved.includes("sample-password"), false);
    await assert.rejects(writeJsonArtifact({}, outputDirectory, "../unsafe.json"), /simple JSON file name/);
  } finally {
    await rm(outputDirectory, { recursive: true });
  }
});

test("resolves Jira artifact storage from configuration and preserves the story directory layout", async () => {
  const configDirectory = await mkdtemp(join(tmpdir(), "qe-generation-config-"));
  const configPath = join(configDirectory, "generation-config.json");
  const config = {
    jiraUrl: "https://jira.example.com/browse/QE-61",
    jiraId: "QE-61",
    repositoryName: "quality/platform",
    outputFolder: "artifacts",
    uiGenerationEnabled: true,
    apiGenerationEnabled: true,
    performanceGenerationEnabled: true
  };

  try {
    await writeFile(configPath, JSON.stringify(config), "utf8");
    const loadedConfig = await loadGenerationConfig(configPath);
    const paths = resolveJiraGenerationPaths(loadedConfig, configPath);
    assert.equal(paths.outputRoot, join(configDirectory, "artifacts"));
    assert.equal(paths.jiraFolder, join(configDirectory, "artifacts", "QE-61"));
    assert.equal(paths.jiraStoryUrl, config.jiraUrl);
    assert.equal(paths.jiraProjectKey, "QE");
    assert.deepEqual(paths.testRepositoryPaths, { UI: undefined, API: undefined, Performance: undefined });
    assert.equal(paths.xrayImportFormat, "JSON");
    assert.equal(paths.xrayAutoImport, false);
    assert.equal(paths.linkAutomationToXray, true);
    assert.equal(paths.updateXrayExecution, true);
    await createJiraGenerationLayout(paths);

    await Promise.all([
      paths.uiScripts, paths.uiLocators, paths.uiVariables,
      paths.apiScripts, paths.apiLocators, paths.apiVariables, paths.performanceScripts, paths.xrayFolder
    ].map((directory) => access(directory)));

    const analysis = analyzeRequirements({
      story: { key: "QE-61", summary: "Create account", description: "A user can create an account." },
      acceptanceCriteria: [{ id: "AC-1", description: "Valid account details create an account." }]
    });
    const codeMappings = [{
      id: "RCM-1",
      storyKey: "QE-61",
      acceptanceCriteriaId: "AC-1",
      changeType: "added" as const,
      changeAreas: ["business-logic" as const],
      repository: config.repositoryName,
      branch: "feature/QE-61-account",
      commit: "abc123",
      filePath: "src/accounts/create.ts",
      changeSummary: "Adds account creation behavior."
    }];
    const cases = generateTestCases(analysis, codeMappings);
    await writeGeneratedFile(paths, "uiScripts", "account.spec.ts", "export {};\n");
    await writeGeneratedFile(paths, "apiScripts", "account.test.ts", "export {};\n");
    await writeGeneratedFile(paths, "performanceScripts", "account.perf.ts", "export {};\n");
    await writeGeneratedFile(paths, "uiLocators", "account.json", "{}\n");
    await writeGeneratedFile(paths, "apiVariables", "account.json", "{}\n");
    await writeRequirementAnalysisForJiraStory(paths, analysis);
    await writeRequirementCodeMappingsForJiraStory(paths, analysis, codeMappings);
    await writeScenarioAnalysisForJiraStory(paths, analysis);
    await writeTestCasesForJiraStory(paths, cases);
    await writeJiraTestCaseIssueLinks(paths, [{
      storyKey: "QE-61",
      testCaseId: "TC-1",
      issueKey: "QE-201",
      issueUrl: "https://jira.example.com/browse/QE-201",
      boardUrl: "https://jira.example.com/jira/test-management/projects/QE",
      projectKey: "QE",
      repositoryPath: "Regression/API/DeltaLoad",
      sections: ["API"],
      testManagementTool: "Xray"
    }]);
    await writeExecutionSummaryForJiraStory(paths, {
      executionId: "RUN-QE-61",
      revision: "abc123",
      environment: "test",
      startedAt: "2026-10-10T08:00:00Z",
      completedAt: "2026-10-10T08:00:01Z",
      status: "passed",
      results: []
    });

    for (const artifact of [
      paths.requirementAnalysisFile,
      paths.scenarioAnalysisFile,
      paths.testCasesFile,
      paths.executionSummaryFile,
      join(paths.jiraFolder, "requirement-code-mapping.json"),
      join(paths.jiraFolder, "jira-test-case-links.json"),
      join(paths.uiScripts, "account.spec.ts"),
      join(paths.apiScripts, "account.test.ts"),
      join(paths.performanceScripts, "account.perf.ts")
    ]) {
      await access(artifact);
      assert.ok(artifact.startsWith(paths.outputRoot));
    }
    await assert.rejects(writeGeneratedFile(paths, "uiScripts", "../outside.ts", "unsafe"), /simple file name/);
    const disabledPaths = { ...paths, uiGenerationEnabled: false };
    await assert.rejects(writeGeneratedFile(disabledPaths, "uiScripts", "disabled.spec.ts", "export {};"), /disabled/);
    await assert.rejects(writeGeneratedFile({ ...paths, apiGenerationEnabled: false }, "apiScripts", "disabled.test.ts", "export {};"), /disabled/);
    await assert.rejects(writeGeneratedFile({ ...paths, performanceGenerationEnabled: false }, "performanceScripts", "disabled.perf.ts", "export {};"), /disabled/);
    assert.deepEqual(validateGenerationConfig({ ...config, apiGenerationEnabled: "yes" }), [
      "Generation configuration field apiGenerationEnabled must be a boolean."
    ]);
    const destinationConfig = {
      ...config,
      jiraStoryUrl: "https://jira.example.com/browse/QE-61",
      jiraBoardUrl: "https://jira.example.com/jira/test-management/projects/QE",
      jiraProjectKey: "QE",
      testRepositoryPath: "Regression/API/DeltaLoad",
      testManagementTool: "Xray" as const
    };
    const destinationPaths = resolveJiraGenerationPaths(destinationConfig, configPath);
    assert.deepEqual(destinationPaths.testRepositoryPaths, {
      UI: "Regression/UI/DeltaLoad",
      API: "Regression/API/DeltaLoad",
      Performance: "Regression/Performance/DeltaLoad"
    });
    assert.deepEqual(validateGenerationConfig({ ...destinationConfig, testManagementTool: "Unsupported" }), [
      "Generation configuration testManagementTool must be one of: Xray, XRAY, Zephyr, TM4J, Native Jira Issue Type."
    ]);
      assert.deepEqual(validateGenerationConfig({ ...config, minimumReadinessScore: 101 }), [
        "Generation configuration minimumReadinessScore must be a number between 0 and 100."
      ]);
  } finally {
    await rm(configDirectory, { recursive: true, force: true });
  }
});

test("writes canonical Xray JSON and derives a traceable importer CSV", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-xray-import-"));
  try {
    const config = {
      jiraUrl: "https://mercedes-benz.atlassian.net/browse/NEXUS-2807",
      jiraId: "NEXUS-2807",
      repositoryName: "quality/platform",
      outputFolder: "generated-test-cases",
      uiGenerationEnabled: true,
      apiGenerationEnabled: true,
      performanceGenerationEnabled: false,
      jiraStoryUrl: "https://mercedes-benz.atlassian.net/browse/NEXUS-2807",
      jiraProjectKey: "NEXUS",
      testManagementTool: "XRAY" as const,
      xrayRepositoryPath: "AI_Generated_tests",
      xrayCreateStoryFolder: true,
      xrayStoryFolderPattern: "{storyId}",
      xrayImportFormat: "CSV" as const,
      xrayAutoImport: false,
      linkAutomationToXray: true,
      updateXrayExecution: true
    };
    const paths = resolveJiraGenerationPaths(config, join(outputDirectory, "generation-config.json"));
    await createJiraGenerationLayout(paths);
    const analysis = analyzeRequirements({
      story: { key: "NEXUS-2807", summary: "Verify delta load", description: "A user can verify a delta load." },
      acceptanceCriteria: [{ id: "AC-1", description: "A valid delta load returns success." }]
    });
    const generated = generateTestCases(analysis, [{
      id: "RCM-1",
      storyKey: "NEXUS-2807",
      acceptanceCriteriaId: "AC-1",
      changeType: "modified",
      changeAreas: ["api"],
      repository: "quality/platform",
      branch: "feature/NEXUS-2807-delta",
      commit: "abc123",
      filePath: "src/delta.ts",
      changeSummary: "Adds delta load behavior."
    }]);
    const testCases = [{
      ...generated[0]!,
      title: "Verify delta load success",
      steps: [
        { sequence: 1, action: "Submit \"valid\", delta request", expectedOutcome: "HTTP 200 returned" },
        { sequence: 2, action: "Verify returned result", expectedOutcome: "Result is visible" }
      ]
    }];
    const model = createCanonicalXrayImport(analysis, testCases, paths, {
      "TC-1": {
        automationLinks: [{
          automationId: "AUT-1",
          scriptPath: "API/Scripts/delta-load-api.spec.ts",
          repository: "quality/platform",
          branch: "feature/NEXUS-2807-delta",
          commit: "abc123",
          pullRequest: "https://ghe.example/pull/2807"
        }],
        executions: [{ executionId: "RUN-1", status: "passed", url: "https://ghe.example/actions/runs/1" }],
        defects: [{ issueKey: "NEXUS-3001", url: "https://mercedes-benz.atlassian.net/browse/NEXUS-3001" }],
        stepData: { 1: "token=sample-secret" }
      }
    });

    assert.equal(model.xrayRepositoryPath, "AI_Generated_tests/NEXUS-2807");
    assert.equal(model.tests[0]?.id, "[NEXUS-2807][AI-01]");
    assert.equal(model.tests[0]?.testType, "Manual");
    assert.equal(model.tests[0]?.traceability.automationLinks[0]?.scriptPath, "API/Scripts/delta-load-api.spec.ts");
    const result = await writeXrayImportArtifacts(model, paths);
    assert.equal(result.csvPath, join(paths.xrayFolder, "xray-import.csv"));
    assert.equal(result.canonicalModel.tests[0]?.steps[0]?.data, "token=[REDACTED]");
    const canonical = JSON.parse(await readFile(result.canonicalJsonPath, "utf8"));
    const csv = await readFile(result.csvPath!, "utf8");
    assert.equal(canonical.tests[0].steps[0].data, "token=[REDACTED]");
    assert.equal(csv.split("\r\n")[0], "Test ID,Summary,Repository Path,Test Type,Description,Action,Data,Expected Result");
    assert.match(csv, /^\[NEXUS-2807\]\[AI-01\],\[NEXUS-2807\]\[AI-01\] Verify delta load success,AI_Generated_tests\/NEXUS-2807,Manual,\[AI\]\[JIRA Story\] /m);
    assert.match(csv, /"Submit ""valid"", delta request",token=\[REDACTED\],HTTP 200 returned/);
    assert.match(csv, /^\[NEXUS-2807\]\[AI-01\],,AI_Generated_tests\/NEXUS-2807,Manual,,Verify returned result,Use approved synthetic test data; do not include secrets\.,Result is visible$/m);
    assert.equal(canonical.tests[0].traceability.automationLinks[0].scriptPath, "API/Scripts/delta-load-api.spec.ts");
    assert.equal(csv.includes("sample-secret"), false);
    const jsonOnlyPaths = { ...paths, xrayFolder: join(outputDirectory, "json-only-xray"), xrayImportFormat: "JSON" as const };
    const jsonOnlyResult = await writeXrayImportArtifacts(model, jsonOnlyPaths);
    assert.equal(jsonOnlyResult.csvPath, undefined);
    await assert.rejects(access(join(jsonOnlyPaths.xrayFolder, "xray-import.csv")));
    const disabledLinksModel = createCanonicalXrayImport(analysis, testCases, {
      ...paths,
      linkAutomationToXray: false,
      updateXrayExecution: false
    }, { "TC-1": { automationLinks: [{ automationId: "AUT-1", scriptPath: "api/test.ts", repository: "repo", branch: "branch", commit: "abc" }], executions: [{ executionId: "RUN-1", status: "passed" }] } });
    assert.deepEqual(disabledLinksModel.tests[0]?.traceability.automationLinks, []);
    assert.deepEqual(disabledLinksModel.tests[0]?.traceability.executions, []);
    await writeXrayTestIssueLinks(paths, [{
      storyKey: "NEXUS-2807",
      xrayTestId: "[NEXUS-2807][AI-01]",
      generatedTestCaseId: "TC-1",
      jiraIssueKey: "NEXUS-9100",
      jiraIssueUrl: "https://mercedes-benz.atlassian.net/browse/NEXUS-9100",
      xrayRepositoryPath: "AI_Generated_tests/NEXUS-2807"
    }]);
    const savedXrayLinks = JSON.parse(await readFile(join(paths.xrayFolder, "xray-test-links.json"), "utf8"));
    assert.equal(savedXrayLinks[0].jiraIssueKey, "NEXUS-9100");
    assert.deepEqual(validateGenerationConfig({ ...config, xrayImportFormat: "XML" }), [
      "Generation configuration xrayImportFormat must be JSON or CSV."
    ]);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("discovers API contracts and builds requirement, code, Xray, risk, and automation intelligence", async () => {
  const operations = normalizeOpenApiDocument({
    openapi: "3.0.3",
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
      schemas: {
        Payment: { type: "object", required: ["id", "status"], properties: { id: { type: "string" }, status: { type: "string" } } },
        ApiError: { type: "object", properties: { message: { type: "string" } } }
      }
    },
    paths: {
      "/payments/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", minLength: 1 } }],
        get: {
          operationId: "getPayment",
          summary: "Retrieve payment",
          tags: ["payments", "sensitive"],
          responses: {
            "200": { description: "Payment found", headers: { "X-Request-Id": { type: "string" } }, content: { "application/json": { schema: { $ref: "#/components/schemas/Payment" } } } },
            "404": { description: "Payment not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
          }
        }
      }
    }
  }, "https://oneapi.example.com/openapi.json", "openapi");
  const discovery = discoverApiContracts([{
    portalName: "oneAPI",
    portalUrl: "https://oneapi.example.com",
    sourceType: "oneapi",
    operations
  }]);
  assert.equal(discovery.operations.length, 1);
  assert.equal(discovery.operations[0]?.authentication, "bearer");
  assert.equal(discovery.operations[0]?.pathParameters[0]?.constraints.minLength, 1);
  assert.deepEqual(discovery.operations[0]?.responseHeaders[200], ["X-Request-Id"]);
  assert.equal(discovery.operations[0]?.errorResponses[0]?.status, 404);
  const swaggerOperations = normalizeOpenApiDocument({
    swagger: "2.0",
    securityDefinitions: { apiKey: { type: "apiKey", name: "X-API-Key", in: "header" } },
    security: [{ apiKey: [] }],
    paths: {
      "/items": {
        post: {
          operationId: "createItem",
          parameters: [{ name: "body", in: "body", required: true, schema: { $ref: "#/definitions/Item" } }],
          responses: {
            "201": { description: "Created", schema: { $ref: "#/definitions/Item" } },
            "400": { description: "Invalid request", schema: { $ref: "#/definitions/Error" } }
          }
        }
      }
    }
  }, "https://api.example.com/swagger.json", "swagger");
  assert.equal(swaggerOperations[0]?.authentication, "api-key");
  assert.equal(swaggerOperations[0]?.requestSchema?.name, "Item");
  assert.equal(swaggerOperations[0]?.responseSchemas[201]?.name, "Item");
  assert.equal(apiContractsFromEndpointDefinitions({
    getPayment: {
      id: "getPayment",
      method: "GET",
      path: "/payments/{id}",
      description: "Retrieve payment",
      authentication: "bearer",
      expectedStatuses: [200, 404],
      responseSchemas: { 200: "PaymentSchema" }
    }
  }, "https://api.example.com/openapi.json")[0]?.operationId, "getPayment");

  const requirementAnalysis = analyzeRequirements({
    story: { key: "NEXUS-2807", summary: "Read a payment", description: "A user reads sensitive payment status." },
    acceptanceCriteria: [{ id: "AC-1", description: "A valid user can retrieve payment status." }]
  });
  requirementAnalysis.scenarios[0]!.priority = "critical";
  const requirementMapping = [{ operationId: "getPayment", requirementIds: ["FR-1"], acceptanceCriteriaIds: ["AC-1"], evidence: ["Acceptance criterion explicitly names payment retrieval."] }];
  const codeMapping = [{
    operationId: "getPayment",
    repository: "quality/payments",
    branch: "feature/NEXUS-2807-payments",
    commit: "abc123def456",
    pullRequest: "https://ghe.example/pull/2807",
    controllerFiles: ["src/controllers/PaymentsController.ts"],
    serviceFiles: ["src/services/PaymentService.ts"],
    businessLogicFiles: ["src/domain/payment-status.ts"],
    validationFiles: ["src/validators/payment-id.ts"],
    changedFileCount: 4,
    evidence: ["PR diff maps GET /payments/{id} to PaymentsController.getPayment."]
  }];
  const generatedTestCases = generateTestCases(requirementAnalysis, [{
    id: "RCM-1",
    storyKey: "NEXUS-2807",
    acceptanceCriteriaId: "AC-1",
    changeType: "modified",
    changeAreas: ["api"],
    repository: "quality/payments",
    branch: "feature/NEXUS-2807-payments",
    pullRequest: "https://ghe.example/pull/2807",
    commit: "abc123def456",
    filePath: "src/controllers/PaymentsController.ts",
    changeSummary: "Exposes payment retrieval API."
  }]);
  const report = analyzeApiIntelligence({
    storyKey: "NEXUS-2807",
    requirementAnalysis,
    discovery,
    requirementMappings: requirementMapping,
    codeMappings: codeMapping,
    generatedTestCases,
    automationReferences: [{ operationId: "getPayment", testCaseId: "TC-1", scriptPath: "API/Scripts/getPayment.api.spec.ts", automationId: "AUT-1" }],
    xrayEnabled: true,
    testManagementTool: "Xray"
  });
  const categories = new Set(report.xrayTestCases.map((testCase) => testCase.category));
  assert.match(report.xrayTestCases[0]?.id ?? "", /^\[NEXUS-2807\]\[API-01\]$/);
  assert.ok(report.xrayTestCases[0]?.implementationReferences.includes("src/controllers/PaymentsController.ts"));
  assert.equal(report.requirementToApi[0]?.covered, true);
  assert.equal(report.apiToCode[0]?.mapped, true);
  assert.equal(report.coverageRows[0]?.codeMapped, true);
  assert.equal(report.risks[0]?.level, "critical");
  assert.equal(report.governance.ready, true);
  assert.equal(report.executiveMetrics.generatedXrayTestCount, report.xrayTestCases.length);
  assert.ok(categories.has("authentication"));
  assert.ok(categories.has("error-handling"));
  assert.ok(categories.has("contract-validation"));
  assert.ok(report.automationPlan[0]?.environmentVariables.includes("API_TOKEN"));
  assert.equal(report.coverageRows[0]?.dimensions.security, true);
  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-api-intelligence-"));
  try {
    await writeApiIntelligenceArtifact(report, outputDirectory);
    const saved = JSON.parse(await readFile(join(outputDirectory, "api-intelligence-report.json"), "utf8"));
    const dashboard = await readFile(join(outputDirectory, "api-intelligence-dashboard.html"), "utf8");
    assert.equal(saved.schemaVersion, "1.0.0");
    assert.match(dashboard, /API Coverage/);
    assert.match(dashboard, /GET \/payments\/\{id\}/);
  } finally {
    await rm(outputDirectory, { recursive: true });
  }
});

test("reports API correlation gaps and skips governance gates with no applicable security or critical APIs", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-73", summary: "Read service status", description: "A user can check service status." },
    acceptanceCriteria: [{ id: "AC-1", description: "The health endpoint returns a status." }]
  });
  const operations = apiContractsFromEndpointDefinitions({
    getHealth: {
      id: "getHealth",
      method: "GET",
      path: "/health",
      description: "Read service health",
      authentication: "none",
      expectedStatuses: [200],
      responseSchemas: { 200: "HealthSchema" }
    }
  }, "https://api.example.com/openapi.json");
  const discovery = { portals: [], operations, duplicateOperationIds: [], errors: [] };
  const codeMapping = [{
    operationId: "getHealth",
    repository: "quality/platform",
    branch: "main",
    commit: "abc123",
    controllerFiles: ["src/controllers/HealthController.ts"],
    serviceFiles: [],
    businessLogicFiles: [],
    validationFiles: [],
    changedFileCount: 1,
    evidence: ["Endpoint registry maps GET /health to HealthController."]
  }];
  const generatedTestCases = generateTestCases(analysis, [{
    id: "RCM-1",
    storyKey: "QE-73",
    acceptanceCriteriaId: "AC-1",
    changeType: "added",
    changeAreas: ["api"],
    repository: "quality/platform",
    branch: "main",
    commit: "abc123",
    filePath: "src/controllers/HealthController.ts",
    changeSummary: "Adds health endpoint."
  }]);
  const report = analyzeApiIntelligence({
    storyKey: "QE-73",
    requirementAnalysis: analysis,
    discovery,
    requirementMappings: [{ operationId: "getHealth", requirementIds: ["FR-1"], acceptanceCriteriaIds: ["AC-1"], evidence: ["AC-1 names the health endpoint."] }],
    codeMappings: codeMapping,
    generatedTestCases,
    automationReferences: []
  });
  assert.equal(report.governance.ready, true);
  assert.ok(report.governance.notApplicable.some((note) => note.includes("no critical APIs")));
  assert.ok(report.governance.notApplicable.some((note) => note.includes("no authenticated APIs")));

  const uncorrelatedReport = analyzeApiIntelligence({
    storyKey: "QE-73",
    requirementAnalysis: analysis,
    discovery,
    requirementMappings: [],
    codeMappings: [],
    generatedTestCases,
    automationReferences: []
  });
  assert.equal(uncorrelatedReport.gaps.some((gap) => gap.type === "requirement-without-api"), true);
  assert.equal(uncorrelatedReport.gaps.some((gap) => gap.type === "api-without-requirement"), true);
  assert.equal(uncorrelatedReport.gaps.some((gap) => gap.type === "api-without-code"), true);
  assert.equal(uncorrelatedReport.xrayTestCases.length, 0);
});

test("identifies coverage gaps and risk", () => {
  const report = analyzeCoverage(
    [{ id: "REQ-1", priority: "critical", testCaseIds: ["TC-1"] }],
    [{ id: "TC-1", automationIds: ["AUT-1"], requirementIds: ["REQ-1"] }],
    [{ id: "AUT-1", result: "failed" }],
    {
      acceptanceCriteria: [
        { id: "AC-1", priority: "high", testCaseIds: ["TC-1"] },
        { id: "AC-2", priority: "critical", testCaseIds: [] }
      ],
      codePaths: [{ id: "CP-1", priority: "medium", testCaseIds: ["TC-1"] }],
      validations: [{ id: "VR-1", priority: "high", testCaseIds: [] }],
      boundaries: [{ id: "BS-1", priority: "medium", testCaseIds: ["TC-1"] }],
      negative: [{ id: "NS-1", priority: "high", testCaseIds: ["TC-1"] }],
      risk: [
        { id: "RISK-1", priority: "critical", testCaseIds: ["TC-1"] },
        { id: "RISK-2", priority: "high", testCaseIds: [] }
      ],
      highRiskCodePaths: [{ id: "CP-HIGH", priority: "critical", testCaseIds: [] }]
    }
  );
  assert.equal(report.requirementCoveragePercent, 100);
  assert.equal(report.testCaseCoveragePercent, 100);
  assert.equal(report.codeCoveragePercent, 100);
  assert.equal(report.riskCoveragePercent, 50);
  assert.equal(report.criticalRequirementCoveragePercent, 100);
  assert.equal(report.highRiskCodeCoveragePercent, 0);
  assert.equal(report.gaps[0]?.type, "failed-execution");
  assert.equal(report.coverageByDimension.acceptanceCriteria.coveragePercent, 50);
  assert.equal(report.coverageByDimension.codePath.coveragePercent, 100);
  assert.equal(report.coverageByDimension.validation.coveragePercent, 0);
  assert.equal(report.coverageByDimension.boundary.coveragePercent, 100);
  assert.equal(report.coverageByDimension.negative.coveragePercent, 100);
  assert.ok(report.gaps.some((gap) => gap.type === "missing-acceptance-criteria-coverage"));
  assert.ok(report.gaps.some((gap) => gap.type === "missing-high-risk-code-coverage"));
  assert.equal(report.riskLevel, "critical");
  const mixedRiskReport = analyzeCoverage(
    [{ id: "REQ-CRITICAL", priority: "critical", testCaseIds: [] }, ...Array.from({ length: 20 }, (_, index) => ({
      id: `REQ-LOW-${index + 1}`,
      priority: "low" as const,
      testCaseIds: []
    }))],
    [],
    []
  );
  assert.equal(mixedRiskReport.overallRiskScore, 100);
});

test("builds coverage matrices, identifies implementation/test/scope gaps, and enforces governance", async () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-70", summary: "Review account behavior", description: "A user views account status." },
    acceptanceCriteria: [
      { id: "AC-1", description: "The account status endpoint returns the current status." },
      { id: "AC-2", description: "Payment status must be returned to the client." },
      { id: "AC-3", description: "The account response includes the account owner." }
    ]
  });
  const codeMappings = analysis.acceptanceCriteria.map((criterion, index) => ({
    id: `RCM-${index + 1}`,
    storyKey: analysis.story.key,
    acceptanceCriteriaId: criterion.id,
    changeType: "modified" as const,
    changeAreas: ["api" as const],
    repository: "quality/platform",
    branch: "feature/QE-70-accounts",
    commit: "abc123",
    filePath: "src/accounts.ts",
    changeSummary: `Implements ${criterion.id}`
  }));
  const allTestCases = generateTestCases(analysis, codeMappings);
  const testCases = allTestCases.filter((testCase) => testCase.traceability.acceptanceCriteriaIds.includes("AC-1"));
  const initialCodeValidation = validateRequirementsAgainstCode(analysis, [{
    path: "src/accounts.ts",
    content: "FR-1 account status endpoint current status"
  }]);
  const codeValidation = {
    ...initialCodeValidation,
    findings: initialCodeValidation.findings.map((finding) =>
      finding.requirementId === "FR-3" ? { ...finding, status: "missing" as const, confidence: 0, evidenceFiles: [] } : finding
    ),
    missingCount: initialCodeValidation.findings.filter((finding) => finding.requirementId === "FR-3").length
  };
  const xrayCoverageInput = {
    analysis,
    codeValidation: initialCodeValidation,
    testCases,
    automations: [{ id: "AUT-1", testCaseIds: ["TC-1"], scriptPaths: ["API/Scripts/account-status.spec.ts"] }],
    codePaths: [],
    xrayEnabled: true,
    scriptCoverageEnabled: true,
    xrayIssueLinks: []
  };
  const xrayGaps = analyzeCoverageIntelligence(xrayCoverageInput);
  assert.equal(xrayGaps.metrics.xrayCoveragePercent, 0);
  assert.equal(xrayGaps.metrics.scriptCoveragePercent, 100);
  assert.deepEqual(xrayGaps.gaps.missingXrayLinks, ["TC-1"]);
  assert.ok(xrayGaps.gaps.findings.some((gap) => gap.type === "missing-xray-link"));
  const xrayCovered = analyzeCoverageIntelligence({
    ...xrayCoverageInput,
    xrayIssueLinks: [{
      storyKey: "QE-70",
      testCaseId: "TC-1",
      issueKey: "QE-901",
      issueUrl: "https://jira.example.com/browse/QE-901",
      boardUrl: "https://jira.example.com/jira/test-management/projects/QE",
      projectKey: "QE",
      repositoryPath: "AI_Generated_tests/QE-70",
      sections: ["API"],
      testManagementTool: "XRAY"
    }]
  });
  assert.equal(xrayCovered.metrics.xrayCoveragePercent, 100);
  assert.deepEqual(xrayCovered.gaps.missingXrayLinks, []);
  assert.deepEqual(xrayCovered.requirementCoverageMatrix[0]?.xrayIssueKeys, ["QE-901"]);
  assert.deepEqual(xrayCovered.requirementCoverageMatrix[0]?.scriptPaths, ["API/Scripts/account-status.spec.ts"]);

  const report = analyzeCoverageIntelligence({
    analysis,
    codeValidation,
    testCases,
    automations: [{ id: "AUT-1", testCaseIds: ["TC-1"], result: "passed" }],
    codePaths: [
      {
        filePath: "src/accounts.ts",
        functionName: "getAccountStatus",
        apiName: "GET /accounts/status",
        repository: "quality/platform",
        branch: "feature/QE-70-accounts",
        pullRequest: "https://ghe.example/pull/70",
        commit: "abc123def456",
        requirementIds: ["FR-1"],
        acceptanceCriteriaIds: ["AC-1"],
        testCaseIds: ["TC-1"],
        priority: "critical"
      },
      {
        filePath: "src/payments.ts",
        functionName: "getPaymentStatus",
        apiName: "GET /payments/status",
        requirementIds: ["FR-2"],
        acceptanceCriteriaIds: ["AC-2"],
        testCaseIds: [],
        priority: "high"
      },
      {
        filePath: "src/legacy.ts",
        functionName: "legacyLookup",
        requirementIds: [],
        acceptanceCriteriaIds: [],
        testCaseIds: [],
        priority: "medium"
      }
    ],
    sourceImpact: {
      changedFiles: ["src/accounts.ts", "src/unmapped.ts"],
      impactedModuleIds: ["accounts"],
      impactedRequirementIds: ["FR-1", "FR-2"],
      impactedTestCaseIds: ["TC-1"],
      impactedAutomationIds: ["AUT-1"],
      unmappedFiles: ["src/unmapped.ts"]
    },
    previousMetrics: {
      requirementCoveragePercent: 0,
      acceptanceCriteriaCoveragePercent: 0,
      codeCoveragePercent: 0,
      testCaseCoveragePercent: 0,
      automationCoveragePercent: 0,
      riskCoveragePercent: 0
    }
  });

  assert.equal(report.requirementCoverageMatrix.find((row) => row.requirementId === "FR-1")?.status, "covered");
  assert.equal(report.metrics.scriptCoveragePercent, null);
  assert.ok(report.codeCoverageMapping.some((row) => row.apiName === "GET /accounts/status" && row.status === "covered"));
  assert.ok(report.gaps.missingTests.includes("FR-2"));
  assert.ok(report.gaps.missingImplementations.includes("FR-3"));
  assert.ok(report.gaps.findings.some((gap) => gap.type === "scope-creep" && gap.entityId === "src/legacy.ts#legacyLookup"));
  assert.ok(report.gaps.findings.some((gap) => gap.type === "uncovered-code-path" && gap.entityId === "src/payments.ts#getPaymentStatus"));
  assert.deepEqual(report.gaps.unmappedFiles, ["src/unmapped.ts"]);
  assert.ok(report.gaps.findings.some((gap) => gap.type === "unmapped-code-change"));
  assert.equal(report.codeCoverageMapping.find((row) => row.apiName === "GET /accounts/status")?.commit, "abc123def456");
  assert.equal(report.governance.ready, false);
  assert.equal(report.review.sufficient, false);
  assert.ok(report.risks.some((risk) => risk.entityId === "src/payments.ts#getPaymentStatus" && risk.uncovered));
  assert.ok(report.trends.some((trend) => trend.metric === "requirementCoveragePercent" && trend.changePercentagePoints > 0));

  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-coverage-intelligence-"));
  try {
    await writeCoverageIntelligenceReport(report, outputDirectory);
    const json = await readFile(join(outputDirectory, "coverage-intelligence-report.json"), "utf8");
    const html = await readFile(join(outputDirectory, "coverage-dashboard.html"), "utf8");
    assert.equal(JSON.parse(json).schemaVersion, "1.0.0");
    assert.match(html, /Requirement Coverage Matrix/);
    assert.match(html, /GET \/accounts\/status/);
    assert.match(html, /abc123def456/);
    assert.match(html, /Coverage Gaps/);
    assert.match(html, /Coverage Risks/);
    assert.match(html, /Governance/);
  } finally {
    await rm(outputDirectory, { recursive: true });
  }
});

test("keeps a multi-criterion requirement partial when one Acceptance Criterion lacks a test", () => {
  const sourceAnalysis = analyzeRequirements({
    story: { key: "QE-71", summary: "Account behavior", description: "A user reads account status." },
    acceptanceCriteria: [
      { id: "AC-1", description: "The status endpoint returns an account status." },
      { id: "AC-2", description: "The response includes the account owner." },
      { id: "AC-3", description: "An unknown account returns not found." }
    ]
  });
  const analysis = {
    ...sourceAnalysis,
    functionalRequirements: [{
      id: "FR-COMBINED",
      description: "Return account status and owner.",
      acceptanceCriteriaIds: ["AC-1", "AC-2"]
    }],
    businessRules: [],
    nonFunctionalRequirements: [],
    validationRules: [],
    implicitRequirements: [],
    risks: []
  };
  const codeMappings = sourceAnalysis.acceptanceCriteria.map((criterion, index) => ({
    id: `RCM-${index + 1}`,
    storyKey: "QE-71",
    acceptanceCriteriaId: criterion.id,
    changeType: "modified" as const,
    changeAreas: ["api" as const],
    repository: "quality/platform",
    branch: "feature/QE-71-account",
    commit: "abc123",
    filePath: "src/accounts.ts",
    changeSummary: `Implements ${criterion.id}`
  }));
  const testCases = generateTestCases(sourceAnalysis, codeMappings).filter((testCase) =>
    testCase.traceability.acceptanceCriteriaIds.includes("AC-1")
  );
  const report = analyzeCoverageIntelligence({
    analysis,
    codeValidation: {
      storyKey: "QE-71",
      findings: [{
        requirementId: "FR-COMBINED",
        requirementType: "functional",
        acceptanceCriteriaIds: ["AC-1", "AC-2"],
        status: "implemented",
        confidence: 1,
        matchedTerms: [],
        evidenceFiles: ["src/accounts.ts"]
      }],
      implementedCount: 1,
      partiallyImplementedCount: 0,
      missingCount: 0,
      sourceFilesExamined: 1
    },
    testCases,
    automations: [{ id: "AUT-1", testCaseIds: [testCases[0]!.id], result: "passed" }],
    codePaths: [{
      filePath: "src/accounts.ts",
      functionName: "getAccountSummary",
      apiName: "GET /accounts/{id}",
      requirementIds: ["FR-COMBINED"],
      acceptanceCriteriaIds: ["AC-1", "AC-2"],
      testCaseIds: [testCases[0]!.id],
      priority: "high"
    }]
  });

  const row = report.requirementCoverageMatrix.find((item) => item.requirementId === "FR-COMBINED");
  assert.equal(row?.status, "partially-covered");
  assert.deepEqual(row?.coveredAcceptanceCriteriaIds, ["AC-1"]);
  assert.deepEqual(row?.uncoveredAcceptanceCriteriaIds, ["AC-2"]);
  assert.ok(row?.missingLinks.some((link) => link.includes("AC-2")));
});

test("pre-automation governance reviews test/code sufficiency without requiring generated scripts", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-72", summary: "Read account status", description: "A user reads an account status." },
    acceptanceCriteria: [{ id: "AC-1", description: "The account status endpoint returns the current status." }]
  });
  const testCases = generateTestCases(analysis, [{
    id: "RCM-1",
    storyKey: "QE-72",
    acceptanceCriteriaId: "AC-1",
    changeType: "modified",
    changeAreas: ["api"],
    repository: "quality/platform",
    branch: "feature/QE-72-status",
    commit: "abc123",
    filePath: "src/accounts.ts",
    changeSummary: "Adds the account status response."
  }]);
  const codeValidation = validateRequirementsAgainstCode(analysis, [{
    path: "src/accounts.ts",
    content: "FR-1 account status endpoint returns current status"
  }]);
  const input = {
    analysis,
    codeValidation,
    testCases,
    automations: [],
    codePaths: [{
      filePath: "src/accounts.ts",
      functionName: "getAccountStatus",
      apiName: "GET /accounts/status",
      requirementIds: ["FR-1"],
      acceptanceCriteriaIds: ["AC-1"],
      testCaseIds: ["TC-1"],
      priority: "medium" as const
    }]
  };
  const beforeAutomation = analyzeCoverageIntelligence({ ...input, reviewStage: "pre-automation" });
  const finalReview = analyzeCoverageIntelligence({ ...input, reviewStage: "final" });

  assert.equal(beforeAutomation.governance.ready, true);
  assert.equal(beforeAutomation.governance.reviewStage, "pre-automation");
  assert.ok(beforeAutomation.governance.notApplicable.some((item) => item.includes("Automation coverage")));
  assert.equal(finalReview.governance.ready, false);
  assert.equal(finalReview.requirementCoverageMatrix[0]?.status, "partially-covered");
});

test("maps source changes to impacted tests and selects regression scope", () => {
  const impact = analyzeSourceImpact(["src\\pages\\LoginPage.ts", "src\\unknown.ts"], [{
    path: "src/pages/LoginPage.ts",
    moduleId: "login-page",
    requirementIds: ["FR-1"],
    testCaseIds: ["TC-1"],
    automationIds: ["AUT-1"]
  }]);
  assert.deepEqual(impact.impactedTestCaseIds, ["TC-1"]);
  assert.deepEqual(impact.unmappedFiles, ["src/unknown.ts"]);

  const inventory = [
    { id: "TC-1", kind: "ui" as const, tags: ["regression"], requirementIds: ["FR-1"] },
    { id: "TC-2", kind: "api" as const, tags: ["smoke"], requirementIds: ["FR-2"] },
    { id: "TC-3", kind: "ui" as const, tags: ["smoke"], requirementIds: ["FR-3"] }
  ];
  const mappedImpact = { ...impact, unmappedFiles: [] };
  assert.deepEqual(selectTests("regression", inventory, mappedImpact).testIds, ["TC-1"]);
  const conservativeSelection = selectTests("regression", inventory, impact);
  assert.equal(conservativeSelection.scope, "full");
  assert.deepEqual(conservativeSelection.testIds, ["TC-1", "TC-2", "TC-3"]);
  assert.deepEqual(selectTests("api", inventory).testIds, ["TC-2"]);
  assert.deepEqual(selectTests("smoke", inventory).testIds, ["TC-2", "TC-3"]);
  assert.deepEqual(selectTests("full", inventory).testIds, ["TC-1", "TC-2", "TC-3"]);
});

test("reconstructs a deleted-branch implementation from a linked squash merge and gates untrusted lineage", async () => {
  const configPath = fileURLToPath(new URL("../../../governance-config.json", import.meta.url));
  const config = await loadGovernanceConfig(configPath);
  const source = discoverImplementationSources({
    storyKey: "NEXUS-2807",
    repository: "quality/account",
    featureBranch: {
      repository: "quality/account",
      name: "feature/NEXUS-2807",
      exists: false,
      status: "available",
      linkedStoryKeys: ["NEXUS-2807"],
      reference: "refs/heads/feature/NEXUS-2807"
    },
    pullRequests: [{
      id: "PR-42",
      url: "https://github.example/quality/account/pull/42",
      repository: "quality/account",
      sourceBranch: "feature/NEXUS-2807",
      targetBranch: "main",
      state: "merged",
      mergeStrategy: "squash",
      linkedStoryKeys: ["NEXUS-2807"],
      commitShas: ["squash-42"],
      mergeCommitSha: "squash-42",
      changedFiles: [{ path: "src/api/account.ts", changeType: "modified" }]
    }],
    commits: [{
      sha: "squash-42",
      repository: "quality/account",
      message: "NEXUS-2807 implement account query",
      parentShas: ["base-41"],
      linkedStoryKeys: ["NEXUS-2807"],
      pullRequestIds: ["PR-42"],
      isMergeCommit: false,
      changedFiles: [{ path: "src/api/account.ts", changeType: "modified" }]
    }],
    historicalReferences: [{
      id: "MEM-PR-42",
      kind: "pull-request",
      storyKey: "NEXUS-2807",
      repository: "quality/account",
      reference: "https://github.example/quality/account/pull/42",
      relatedShas: ["squash-42"]
    }]
  });

  assert.equal(source.selectedSource, "pull-request");
  assert.equal(source.reconstructionRequired, true);
  assert.equal(source.repositoryContext.branchExists.value, false);
  assert.equal(source.repositoryContext.pullRequestExists.value, true);
  assert.equal(source.repositoryContext.mergeCommitExists.value, true);
  assert.equal(source.repositoryContext.commitHistoryAvailable.value, true);
  assert.equal(source.repositoryContext.reconstructionRequired.value, true);
  assert.deepEqual(source.memoryLeads.map((item) => item.id), ["MEM-PR-42"]);
  const trust = evaluateImplementationTrust(config, source);
  assert.equal(trust.score, 100);
  assert.equal(trust.decision, "trusted");

  const reconstructed = buildImplementationReconstructionModel(source, [{
    path: "src/api/account.ts",
    changeType: "modified",
    commitShas: ["squash-42"],
    areas: ["api", "business-logic"],
    symbols: ["getAccount"],
    summary: "Changes account lookup behavior.",
    confidence: 0.96,
    evidenceReferences: ["https://github.example/quality/account/commit/squash-42"]
  }], trust);
  assert.equal(reconstructed.status, "complete");
  assert.deepEqual(reconstructed.modifiedFiles, ["src/api/account.ts"]);
  assert.deepEqual(reconstructed.apiChanges.map((item) => item.path), ["src/api/account.ts"]);
  assert.deepEqual(reconstructed.businessLogicChanges.map((item) => item.path), ["src/api/account.ts"]);
  assert.throws(() => buildImplementationReconstructionModel(source, [], { ...trust, decision: "blocked" }), /trusted source model/);

  const recoveryAnalysis = analyzeRequirements({
    story: { key: "NEXUS-2807", summary: "Read account", description: "A user reads an account." },
    acceptanceCriteria: [{ id: "AC-1", description: "The account is returned." }]
  });
  const recoveryMapping: RequirementCodeMapping = {
    id: "RCM-NEXUS-2807-1",
    storyKey: "NEXUS-2807",
    acceptanceCriteriaId: "AC-1",
    changeType: "modified",
    changeAreas: ["api", "business-logic"],
    repository: "quality/account",
    branch: "feature/NEXUS-2807",
    commit: "squash-42",
    filePath: "src/api/account.ts",
    changeSummary: "Changes account lookup behavior."
  };
  const recoveryEvidence = correlateEvidence({
    requirementAnalysis: recoveryAnalysis,
    implementationMappings: [recoveryMapping],
    implementationFindings: validateRequirementsAgainstCode(recoveryAnalysis, [{ path: "src/api/account.ts", content: "AC-1 account is returned" }]),
    confirmedImplementationMappingIds: [recoveryMapping.id],
    implementationSourceModel: source,
    implementationReconstructionModel: reconstructed,
    implementationTrustReport: trust
  });
  assert.equal(recoveryEvidence.implementationSourceModel?.selectedSource, "pull-request");
  assert.equal(recoveryEvidence.implementationReconstructionModel?.status, "complete");
  assert.equal(recoveryEvidence.implementationTrustReport?.decision, "trusted");
  assert.deepEqual(recoveryEvidence.implementationModel.modifiedFiles, ["src/api/account.ts"]);
  assert.deepEqual(recoveryEvidence.implementationModel.apiFiles, ["src/api/account.ts"]);
  assert.ok(recoveryEvidence.evidence.some((item) => item.sourceType === "implementation-trust"));

  const outputRoot = await mkdtemp(join(tmpdir(), "qe-implementation-models-"));
  try {
    const paths = resolveJiraGenerationPaths({
      jiraUrl: "https://jira.example/browse/NEXUS-2807",
      jiraId: "NEXUS-2807",
      repositoryName: "quality/account",
      outputFolder: outputRoot,
      uiGenerationEnabled: false,
      apiGenerationEnabled: false,
      performanceGenerationEnabled: false
    }, join(outputRoot, "generation-config.json"));
    await writeImplementationSourceForJiraStory(paths, source);
    await writeImplementationReconstructionForJiraStory(paths, reconstructed);
    await writeImplementationTrustForJiraStory(paths, trust);
    assert.equal(JSON.parse(await readFile(join(paths.jiraFolder, "implementation-source-model.json"), "utf8")).storyKey, "NEXUS-2807");
    assert.equal(JSON.parse(await readFile(join(paths.jiraFolder, "implementation-reconstruction-model.json"), "utf8")).status, "complete");
    assert.equal(JSON.parse(await readFile(join(paths.jiraFolder, "implementation-trust-report.json"), "utf8")).score, 100);
    await assert.rejects(writeImplementationSourceForJiraStory({ ...paths, jiraFolder: join(paths.outputRoot, "NEXUS-9999") }, source), /does not match/);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }

  const incorrectBranch = discoverImplementationSources({
    ...{
      storyKey: "NEXUS-2807",
      repository: "quality/account",
      featureBranch: {
        repository: "quality/account",
        name: "feature/NEXUS-2807",
        exists: false,
        status: "available" as const,
        linkedStoryKeys: ["NEXUS-2807"]
      }
    },
    pullRequests: [{
      id: "PR-WRONG",
      url: "https://github.example/quality/account/pull/99",
      repository: "quality/account",
      sourceBranch: "feature/OTHER-1",
      targetBranch: "main",
      state: "merged" as const,
      mergeStrategy: "squash" as const,
      linkedStoryKeys: ["NEXUS-2807"],
      commitShas: ["wrong-merge"],
      mergeCommitSha: "wrong-merge",
      changedFiles: []
    }],
    commits: [{
      sha: "wrong-merge",
      repository: "quality/account",
      message: "NEXUS-2807 unrelated branch",
      parentShas: ["base"],
      linkedStoryKeys: ["NEXUS-2807"],
      pullRequestIds: ["PR-WRONG"],
      isMergeCommit: false,
      changedFiles: []
    }]
  });
  const rejectedTrust = evaluateImplementationTrust(config, incorrectBranch);
  assert.equal(rejectedTrust.decision, "blocked");
  assert.ok(rejectedTrust.findings.some((item) => item.category === "branch-mapping"));

  const mergeOnly = discoverImplementationSources({
    storyKey: "NEXUS-2807",
    repository: "quality/account",
    featureBranch: { repository: "quality/account", name: "feature/NEXUS-2807", exists: false, status: "available", linkedStoryKeys: ["NEXUS-2807"] },
    commits: [{
      sha: "merge-2807",
      repository: "quality/account",
      message: "Merge NEXUS-2807",
      parentShas: ["main-base", "feature-head"],
      linkedStoryKeys: ["NEXUS-2807"],
      pullRequestIds: [],
      branches: ["main"],
      isMergeCommit: true,
      changedFiles: [{ path: "src/api/account.ts", changeType: "modified" }]
    }]
  });
  assert.equal(mergeOnly.selectedSource, "merge-commit");
  assert.equal(evaluateImplementationTrust(config, mergeOnly).decision, "trusted");

  const diffOnly = discoverImplementationSources({
    storyKey: "NEXUS-2807",
    repository: "quality/account",
    featureBranch: { repository: "quality/account", name: "feature/NEXUS-2807", exists: false, status: "available", linkedStoryKeys: ["NEXUS-2807"] },
    repositoryDiffs: [{
      id: "DIFF-2807",
      repository: "quality/account",
      baseSha: "release-base",
      headSha: "release-head",
      baseBranch: "release/2026.10",
      linkedStoryKeys: ["NEXUS-2807"],
      reference: "https://github.example/quality/account/compare/release-base...release-head",
      changedFiles: [{ path: "src/api/account.ts", changeType: "modified" }]
    }]
  });
  assert.equal(diffOnly.selectedSource, "repository-diff");
  assert.equal(diffOnly.repositoryContext.commitHistoryAvailable.value, null);
  assert.equal(evaluateImplementationTrust(config, diffOnly).decision, "trusted");
});

test("creates an ordered, dependency-valid workflow for each supported source type", () => {
  for (const sourceType of ["jira-story", "requirement-document", "pull-request"] as const) {
    const plan = createQualityWorkflowPlan(sourceType);
    assert.deepEqual(validateQualityWorkflowPlan(plan), []);
    const stageOrder = plan.stages.map(({ stage }) => stage);
    assert.ok(stageOrder.indexOf("source-context") < stageOrder.indexOf("implementation-analysis"));
    assert.ok(stageOrder.indexOf("source-context") < stageOrder.indexOf("requirement-governance"));
    assert.ok(stageOrder.indexOf("requirement-governance") < stageOrder.indexOf("requirements-analysis"));
    assert.ok(stageOrder.indexOf("requirements-analysis") < stageOrder.indexOf("historical-jira-context"));
    assert.ok(stageOrder.indexOf("historical-jira-context") < stageOrder.indexOf("feature-branch-discovery"));
    assert.ok(stageOrder.indexOf("feature-branch-discovery") < stageOrder.indexOf("repository-acquisition"));
    assert.ok(stageOrder.indexOf("repository-acquisition") < stageOrder.indexOf("implementation-analysis"));
    assert.ok(stageOrder.indexOf("implementation-analysis") < stageOrder.indexOf("adr-discovery"));
    assert.ok(stageOrder.indexOf("api-contract-analysis") < stageOrder.indexOf("evidence-correlation"));
    assert.ok(stageOrder.indexOf("api-code-correlation") < stageOrder.indexOf("adr-discovery"));
    assert.ok(stageOrder.indexOf("adr-discovery") < stageOrder.indexOf("evidence-correlation"));
    assert.ok(stageOrder.indexOf("requirements-analysis") < stageOrder.indexOf("application-discovery"));
    assert.ok(stageOrder.indexOf("application-discovery") < stageOrder.indexOf("xray-repository-analysis"));
    assert.ok(stageOrder.indexOf("xray-repository-analysis") < stageOrder.indexOf("existing-test-reuse-analysis"));
    assert.ok(stageOrder.indexOf("existing-test-reuse-analysis") < stageOrder.indexOf("environment-intelligence"));
    assert.ok(stageOrder.indexOf("environment-intelligence") < stageOrder.indexOf("test-data-analysis"));
    assert.ok(stageOrder.indexOf("test-data-analysis") < stageOrder.indexOf("evidence-correlation"));
    assert.ok(stageOrder.indexOf("requirement-code-validation") < stageOrder.indexOf("test-case-generation"));
    assert.ok(stageOrder.indexOf("evidence-correlation") < stageOrder.indexOf("test-case-generation"));
    assert.ok(stageOrder.indexOf("test-case-generation") < stageOrder.indexOf("requirement-to-code-traceability"));
    assert.ok(stageOrder.indexOf("test-case-generation") < stageOrder.indexOf("test-generation-governance"));
    assert.ok(stageOrder.indexOf("risk-assessment") < stageOrder.indexOf("automation-strategy-selection"));
    assert.ok(stageOrder.indexOf("automation-strategy-selection") < stageOrder.indexOf("playwright-generation"));
    assert.ok(stageOrder.indexOf("test-case-generation") < stageOrder.indexOf("jira-test-case-creation"));
    assert.ok(stageOrder.indexOf("test-case-generation") < stageOrder.indexOf("xray-import-artifact-generation"));
    assert.ok(stageOrder.indexOf("coverage-review") < stageOrder.indexOf("xray-import-artifact-generation"));
    assert.ok(stageOrder.indexOf("xray-import-artifact-generation") < stageOrder.indexOf("xray-import-execution"));
    assert.ok(stageOrder.indexOf("xray-import-execution") < stageOrder.indexOf("jira-test-case-creation"));
    assert.ok(stageOrder.indexOf("jira-test-case-creation") < stageOrder.indexOf("automation-strategy-selection"));
    assert.ok(stageOrder.indexOf("coverage-review") < stageOrder.indexOf("automation-strategy-selection"));
    assert.ok(stageOrder.indexOf("implementation-analysis") < stageOrder.indexOf("api-portal-discovery"));
    assert.ok(stageOrder.indexOf("api-portal-discovery") < stageOrder.indexOf("api-contract-analysis"));
    assert.ok(stageOrder.indexOf("api-contract-analysis") < stageOrder.indexOf("requirement-api-correlation"));
    assert.ok(stageOrder.indexOf("requirement-api-correlation") < stageOrder.indexOf("api-code-correlation"));
    assert.ok(stageOrder.indexOf("api-code-correlation") < stageOrder.indexOf("api-risk-analysis"));
    assert.ok(stageOrder.indexOf("api-risk-analysis") < stageOrder.indexOf("api-test-design"));
    assert.ok(stageOrder.indexOf("api-test-design") < stageOrder.indexOf("xray-api-test-creation"));
    assert.ok(stageOrder.indexOf("xray-api-test-creation") < stageOrder.indexOf("api-coverage-governance"));
    assert.ok(stageOrder.indexOf("api-coverage-governance") < stageOrder.indexOf("api-automation-planning"));
    assert.ok(stageOrder.indexOf("api-automation-planning") < stageOrder.indexOf("api-generation"));
    assert.ok(stageOrder.indexOf("automation-branch-creation") < stageOrder.indexOf("automation-commit-creation"));
    assert.ok(stageOrder.indexOf("automation-commit-creation") < stageOrder.indexOf("pull-request-creation"));
    assert.ok(stageOrder.indexOf("pull-request-creation") < stageOrder.indexOf("github-actions-execution"));
    assert.ok(stageOrder.indexOf("pull-request-creation") < stageOrder.indexOf("jira-automation-linking"));
    assert.ok(stageOrder.indexOf("jira-automation-linking") < stageOrder.indexOf("github-actions-execution"));
    assert.ok(stageOrder.indexOf("coverage-matrix-creation") < stageOrder.indexOf("gap-analysis"));
    assert.ok(stageOrder.indexOf("gap-analysis") < stageOrder.indexOf("risk-analysis"));
    assert.ok(stageOrder.indexOf("risk-analysis") < stageOrder.indexOf("coverage-governance-validation"));
    assert.ok(stageOrder.indexOf("coverage-governance-validation") < stageOrder.indexOf("readiness-assessment"));
    assert.ok(stageOrder.indexOf("readiness-assessment") < stageOrder.indexOf("automation-branch-creation"));
    assert.ok(stageOrder.indexOf("script-governance") < stageOrder.indexOf("enterprise-quality-gate"));
    assert.ok(stageOrder.indexOf("hallucination-validation") < stageOrder.indexOf("enterprise-quality-gate"));
    assert.ok(stageOrder.indexOf("privacy-validation") < stageOrder.indexOf("enterprise-quality-gate"));
    assert.ok(stageOrder.indexOf("enterprise-quality-gate") < stageOrder.indexOf("automation-branch-creation"));
    assert.ok(stageOrder.indexOf("enterprise-quality-gate") < stageOrder.indexOf("github-actions-execution"));
    assert.equal(plan.stages.find(({ stage }) => stage === "automation-branch-creation")?.condition, "enterprise-gate-coverage-readiness-passed");
    assert.ok(stageOrder.indexOf("automation-branch-creation") < stageOrder.indexOf("pull-request-creation"));
    assert.ok(stageOrder.indexOf("readiness-assessment") < stageOrder.indexOf("github-actions-execution"));
    assert.equal(plan.stages.find(({ stage }) => stage === "github-actions-execution")?.condition, "enterprise-quality-gate-passed");
      assert.ok(stageOrder.indexOf("feature-branch-discovery") < stageOrder.indexOf("merge-traceability-discovery"));
      assert.ok(stageOrder.indexOf("merge-traceability-discovery") < stageOrder.indexOf("implementation-trust-validation"));
      assert.ok(stageOrder.indexOf("implementation-trust-validation") < stageOrder.indexOf("commit-reconstruction"));
      assert.ok(stageOrder.indexOf("commit-reconstruction") < stageOrder.indexOf("repository-acquisition"));
      assert.equal(plan.stages.find(({ stage }) => stage === "merge-traceability-discovery")?.condition, "feature-branch-missing");
      assert.equal(plan.stages.find(({ stage }) => stage === "commit-reconstruction")?.condition, "implementation-source-trust-passed");
      assert.equal(plan.stages.find(({ stage }) => stage === "repository-acquisition")?.condition, "implementation-source-approved");
    assert.ok(stageOrder.indexOf("github-actions-execution") < stageOrder.indexOf("automation-promotion"));
    assert.ok(stageOrder.indexOf("traceability-reporting") < stageOrder.indexOf("executive-report"));
    assert.equal(stageOrder.at(-1), "executive-report");
  }
});

test("selects and loads only progressive-disclosure skills for the request and branch context", async () => {
  const commonContext = { status: "available" as const, references: ["NEXUS-2807"] };
  const branchRoute = selectProgressiveDisclosureRoute({
    intent: "analyze_branch",
    repositoryContext: {
      branchExists: { ...commonContext, value: true },
      pullRequestExists: { status: "not_checked", value: null, references: [] },
      mergeCommitExists: { status: "not_checked", value: null, references: [] },
      commitHistoryAvailable: { status: "not_checked", value: null, references: [] },
      reconstructionRequired: { ...commonContext, value: false }
    }
  });
  assert.ok(branchRoute.selectedSkills.includes("implementation-intelligence"));
  assert.ok(!branchRoute.selectedSkills.includes("merge-traceability-intelligence"));
  assert.ok(branchRoute.selectedSkills.includes("governance"));
  assert.ok(branchRoute.supportingAgents.includes("governance-agent"));
  assert.ok(!branchRoute.memoryCategories.includes("historical-prs"));

  const reconstructionRoute = selectProgressiveDisclosureRoute({
    intent: "analyze_branch",
    repositoryContext: {
      branchExists: { ...commonContext, value: false },
      pullRequestExists: { status: "available", value: true, references: ["PR-42"] },
      mergeCommitExists: { status: "not_checked", value: null, references: [] },
      commitHistoryAvailable: { status: "not_checked", value: null, references: [] },
      reconstructionRequired: { ...commonContext, value: true }
    }
  });
  assert.equal(reconstructionRoute.branchResolution, "reconstruction");
  assert.ok(reconstructionRoute.selectedSkills.includes("merge-traceability-intelligence"));
  assert.ok(reconstructionRoute.selectedSkills.includes("commit-reconstruction-intelligence"));
  assert.ok(reconstructionRoute.supportingAgents.includes("merge-traceability-agent"));
  assert.ok(reconstructionRoute.supportingAgents.includes("commit-reconstruction-agent"));
  assert.ok(reconstructionRoute.memoryCategories.includes("historical-prs"));

  const unresolvedRoute = selectProgressiveDisclosureRoute({ intent: "analyze_branch" });
  assert.equal(unresolvedRoute.branchResolution, "pending");
  assert.ok(!unresolvedRoute.selectedSkills.includes("commit-reconstruction-intelligence"));

  const uiRoute = selectProgressiveDisclosureRoute({ intent: "generate_ui_automation" });
  for (const skill of ["jira-intelligence", "github-intelligence", "playwright-intelligence", "coverage-intelligence", "governance"] as const) {
    assert.ok(uiRoute.selectedSkills.includes(skill));
  }
  assert.ok(!uiRoute.selectedSkills.includes("api-intelligence"));

  const projectRoot = await mkdtemp(join(tmpdir(), "qe-progressive-skills-"));
  try {
    await mkdir(join(projectRoot, "skills", "governance"), { recursive: true });
    await mkdir(join(projectRoot, "skills", "api-intelligence"), { recursive: true });
    await mkdir(join(projectRoot, "skills", "unselected-skill"), { recursive: true });
    await mkdir(join(projectRoot, "prompts"), { recursive: true });
    await writeFile(join(projectRoot, "skills", "governance", "skill.md"), "governance metadata");
    await writeFile(join(projectRoot, "skills", "unselected-skill", "skill.md"), "must not load");
    await writeFile(join(projectRoot, "prompts", "api-intelligence.md"), "API prompt");
    await writeFile(join(projectRoot, "prompts", "coverage-intelligence.md"), "must not load");
    const routeWithMissingSkill = selectProgressiveDisclosureRoute({ intent: "unclassified", requestedCapabilities: ["api-intelligence"] });
    const loaded = await loadSelectedSkillMetadata(projectRoot, routeWithMissingSkill);
    assert.deepEqual(loaded.loaded.map((item) => item.name), ["governance"]);
    assert.deepEqual(loaded.unavailable, ["api-intelligence"]);
    assert.equal(loaded.fallback, "existing-prompt-library");
    assert.ok(uiRoute.selectedPromptContracts.includes("application-exploration.md"));
    assert.ok(uiRoute.selectedPromptContracts.includes("ui-automation-generation.md"));
    assert.ok(!uiRoute.selectedPromptContracts.includes("api-intelligence.md"));
    const loadedPrompts = await loadSelectedPromptContracts(projectRoot, routeWithMissingSkill);
    assert.deepEqual(loadedPrompts.loaded.map((item) => item.name), ["api-intelligence.md"]);
    assert.deepEqual(loadedPrompts.unavailable, ["api-automation-generation.md"]);
    assert.equal(loadedPrompts.fallback, "existing-prompt-library");
    const traversalRoute = { ...routeWithMissingSkill, selectedSkills: ["../../AGENT"] } as unknown as typeof routeWithMissingSkill;
    await assert.rejects(loadSelectedSkillMetadata(projectRoot, traversalRoute), /escapes the catalog root/);
    const promptTraversalRoute = { ...routeWithMissingSkill, selectedPromptContracts: ["../AGENT.md"] } as unknown as typeof routeWithMissingSkill;
    await assert.rejects(loadSelectedPromptContracts(projectRoot, promptTraversalRoute), /escapes the prompt root/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("selects automation strategies from requirement and implementation evidence", () => {
  const decisions = selectAutomationStrategies([
    {
      requirementId: "FR-1",
      requirementType: "functional",
      implementationSurface: "api",
      changedFiles: ["src/routes/users.ts"],
      rationale: "The changed controller exposes the behavior over the API."
    },
    {
      requirementId: "FR-1",
      requirementType: "functional",
      implementationSurface: "contract",
      changedFiles: ["api-framework/src/schemas/user.schema.ts"],
      rationale: "The response schema changed with the API contract."
    },
    {
      requirementId: "NFR-1",
      requirementType: "non-functional",
      implementationSurface: "performance",
      changedFiles: ["src/services/search.ts"],
      rationale: "The acceptance criterion sets a response-time threshold for the changed query path."
    }
  ]);
  assert.deepEqual(decisions.map((decision) => decision.strategy), ["api-test", "contract-test", "performance-test"]);
  assert.deepEqual(decisions.map((decision) => decision.implementationSurfaces), [["api"], ["contract"], ["performance"]]);
  assert.throws(() => selectAutomationStrategies([{
    requirementId: "FR-2",
    requirementType: "functional",
    implementationSurface: "performance",
    changedFiles: ["src/orders.ts"],
    rationale: "No performance criterion exists."
  }]), /requires non-functional requirement evidence/);
});

test("routes generated Jira test cases to configured UI, API, and performance sections", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-62", summary: "Sign in and search", description: "A user signs in and searches accounts." },
    acceptanceCriteria: [
      { id: "AC-1", description: "The dashboard is displayed after a successful sign in." },
      { id: "AC-2", description: "The account status endpoint returns the current status." },
      { id: "AC-3", description: "Search response time remains below 200 ms." }
    ]
  });
  const codeMappings = analysis.acceptanceCriteria.map((criterion, index) => ({
    id: `RCM-${index + 1}`,
    storyKey: analysis.story.key,
    acceptanceCriteriaId: criterion.id,
    changeType: "modified" as const,
    changeAreas: ["business-logic" as const],
    repository: "quality/platform",
    branch: "feature/QE-62-search",
    commit: "abc123",
    filePath: "src/search.ts",
    changeSummary: `Implements ${criterion.id}`
  }));
  const testCases = generateTestCases(analysis, codeMappings);
  const decisions = selectAutomationStrategies([
    { requirementId: "FR-1", requirementType: "functional", implementationSurface: "ui", changedFiles: ["src/pages/dashboard.ts"], rationale: "The changed dashboard is user-visible." },
    { requirementId: "FR-2", requirementType: "functional", implementationSurface: "api", changedFiles: ["src/api/accounts.ts"], rationale: "The changed account endpoint exposes the criterion." },
    { requirementId: "NFR-1", requirementType: "non-functional", implementationSurface: "performance", changedFiles: ["src/search.ts"], rationale: "The requirement sets a response-time threshold." }
  ]);
  const paths = resolveJiraGenerationPaths({
    jiraUrl: "https://jira.example.com/browse/QE-62",
    jiraId: "QE-62",
    repositoryName: "quality/platform",
    outputFolder: "generated",
    uiGenerationEnabled: true,
    apiGenerationEnabled: true,
    performanceGenerationEnabled: true,
    jiraStoryUrl: "https://jira.example.com/browse/QE-62",
    jiraBoardUrl: "https://jira.example.com/jira/test-management/projects/QE",
    jiraProjectKey: "QE",
    testRepositoryPath: "Regression/API/DeltaLoad",
    testManagementTool: "Xray"
  }, "generation-config.json");

  const routing = createJiraTestCaseRoutingPlan(analysis, testCases, decisions, paths);
  assert.deepEqual(routing.unroutedTestCaseIds, []);
  assert.equal(routing.destinations.UI.testCases[0]?.id, "TC-1");
  assert.equal(routing.destinations.API.testCases[0]?.id, "TC-2");
  assert.equal(routing.destinations.Performance.testCases[0]?.id, "TC-3");
  assert.deepEqual(routing.destinations.UI.testCases[0]?.repositorySections, ["UI"]);
  assert.deepEqual(routing.testCases.map((testCase) => testCase.repositorySections), [["UI"], ["API"], ["Performance"]]);
  assert.equal(routing.destinations.UI.repositoryPath, "Regression/UI/DeltaLoad");
  assert.equal(routing.destinations.API.repositoryPath, "Regression/API/DeltaLoad");
  assert.equal(routing.destinations.Performance.repositoryPath, "Regression/Performance/DeltaLoad");
  assert.ok(Object.values(routing.destinations).every((destination) => destination.ready));
});

test("reports source evidence without overstating requirement implementation", () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-55", summary: "Sign in", description: "A user signs in." },
    acceptanceCriteria: [
      { id: "AC-1", description: "The sign in page is displayed." },
      { id: "AC-2", description: "The user can reset the password." }
    ]
  });
  const report = validateRequirementsAgainstCode(analysis, [
    { path: "src/login.ts", content: "// FR-1 implements sign in page" }
  ]);
  assert.equal(report.implementedCount, 1);
  assert.equal(report.missingCount, 1);
  assert.equal(report.findings[0]?.evidenceFiles[0], "src/login.ts");
});

test("correlates and persists requirement, history, implementation, API, ADR, Xray, and automation evidence", async () => {
  const analysis = analyzeRequirements({
    story: { key: "QE-90", summary: "Read account balance", description: "A user reads an account balance." },
    acceptanceCriteria: [{ id: "AC-1", description: "The account balance is returned." }]
  });
  const implementationMappings = [{
    id: "RCM-1",
    storyKey: "QE-90",
    acceptanceCriteriaId: "AC-1",
    changeType: "added" as const,
    changeAreas: ["api", "business-logic", "service", "ui-component"] as ("api" | "business-logic" | "service" | "ui-component")[],
    repository: "quality/accounts",
    branch: "feature/QE-90-balance",
    pullRequest: "https://ghe.example/pull/90",
    commit: "abc123",
    filePath: "src/accounts/balance.ts",
    changeSummary: "Adds account balance retrieval."
  }];
  const implementationFindings = validateRequirementsAgainstCode(analysis, [
    { path: "src/accounts/balance.ts", content: "FR-1 returns account balance." }
  ]);
  const testCases = generateTestCases(analysis, [...implementationMappings]);
  const apiOperation = normalizeOpenApiDocument({
    paths: { "/accounts/balance": { get: { operationId: "getBalance", summary: "Get account balance", responses: { "200": { description: "Balance returned" } } } } }
  }, "https://api.example.com/openapi.json", "openapi")[0]!;
  const applicationDiscovery = buildApplicationDiscoveryIntelligence({
    schemaVersion: "1.0.0",
    applicationId: "APP-ACCOUNT",
    applicationName: "Accounts",
    baseUrl: "https://app.example.com",
    requirementIds: ["FR-1"],
    pages: [{ id: "balance-page", title: "Balance", route: "/balance", status: "discovered", menus: [], forms: [], tables: [], buttons: [], validations: [] }],
    navigationPaths: [],
    userJourneys: [{ id: "JOURNEY-BALANCE", name: "Read balance", requirementIds: ["FR-1"], pageIds: ["balance-page"], navigationPathIds: [], outcome: "Balance is displayed" }]
  });
  const existingXrayInventory: ExistingXrayRepositoryInventory = {
    repositories: [{ path: "AI_Generated_tests", name: "AI Generated Tests" }],
    folders: [{ repositoryPath: "AI_Generated_tests", path: "QE-90", name: "QE-90" }],
    tests: [{ issueKey: "QE-9001", issueUrl: "https://jira.example.com/browse/QE-9001", summary: analysis.scenarios[0]!.title, status: "active", repositoryPath: "AI_Generated_tests", folderPath: "QE-90", acceptanceCriteriaIds: ["AC-1"], scenarioIds: [analysis.scenarios[0]!.id], automationPaths: [] }],
    executions: [],
    historicalCoverage: []
  };
  const xrayRepositoryAnalysis = analyzeExistingXrayRepository(analysis, existingXrayInventory);
  const testReuseAnalysis = analyzeTestReuse(analysis, existingXrayInventory, xrayRepositoryAnalysis);
  const environmentModel = buildEnvironmentIntelligence([{
    name: "DEV",
    acceptanceCriteriaIds: ["AC-1"],
    baseUrl: "https://dev.example.com",
    authenticationPatterns: ["sso"],
    environmentVariables: [],
    apiEndpoints: ["GET /accounts/balance"],
    featureToggles: {},
    configuration: {}
  }]);
  const testDataModel = buildTestDataIntelligence({
    requirementAnalysis: analysis,
    databaseDependencies: [{ id: "DB-BALANCE", name: "Balance store", acceptanceCriteriaIds: ["AC-1"], fields: [{ name: "accountId", dataType: "string", required: true }], setupStrategy: "Seed an isolated account", cleanupStrategy: "Remove the isolated account" }],
    allowSyntheticData: true
  });
  const model = correlateEvidence({
    requirementAnalysis: analysis,
    implementationMappings: [...implementationMappings],
    implementationFindings,
    confirmedImplementationMappingIds: ["RCM-1"],
    featureBranches: [{ repository: "quality/accounts", branch: "feature/QE-90-balance", pullRequest: "https://ghe.example/pull/90", commitIds: ["abc123"], storyReference: "QE-90" }],
    apiOperations: [apiOperation],
    apiMappings: [{ operationId: "getBalance", requirementIds: ["FR-1"], acceptanceCriteriaIds: ["AC-1"], evidence: ["The changed controller implements GET /accounts/balance."] }],
    historicalStories: [{ key: "QE-80", summary: "Account balance API", status: "Done", relationship: "linked-story", acceptanceCriteriaIds: ["AC-1"], implementationReferences: ["src/accounts/legacy-balance.ts"] }],
    adrEvidence: [{ id: "ADR-12", title: "Balance API contract", filePath: "docs/adr/0012-balance-api.md", decision: "Expose balance as a read-only resource.", acceptanceCriteriaIds: ["AC-1"] }],
    applicationDiscovery,
    testReuseAnalysis,
    environmentModel,
    testDataModel,
    xrayRepositoryAnalysis,
    testCases,
    scripts: [{ id: "AUT-1", testCaseId: "TC-1", path: "API/Scripts/get-balance.spec.ts", strategy: "api" }]
  });

  assert.deepEqual(model.confirmedBehaviors.map((behavior) => behavior.acceptanceCriteriaId), ["AC-1"]);
  assert.deepEqual(model.missingBehaviors, []);
  assert.deepEqual(model.implementationModel.addedFiles, ["src/accounts/balance.ts"]);
  assert.deepEqual(model.implementationModel.apiFiles, ["src/accounts/balance.ts"]);
  assert.deepEqual(model.implementationModel.serviceFiles, ["src/accounts/balance.ts"]);
  assert.deepEqual(model.implementationModel.uiComponentFiles, ["src/accounts/balance.ts"]);
  assert.deepEqual(model.traceability[0]?.apiOperationIds, ["getBalance"]);
  assert.deepEqual(model.traceability[0]?.testCaseIds, ["TC-1"]);
  assert.deepEqual(model.traceability[0]?.automationIds, ["AUT-1"]);
  assert.ok((model.confidenceScores[0]?.score ?? 0) >= 90);
  assert.deepEqual(model.evidence.filter((item) => item.sourceType === "adr").map((item) => item.id), ["ADR-12"]);
  for (const sourceType of ["application-discovery", "test-reuse", "environment", "test-data", "xray-repository"] as const) {
    assert.ok(model.evidence.some((item) => item.sourceType === sourceType), `Missing evidence source: ${sourceType}`);
  }
  assert.deepEqual(model.applicationDiscovery?.screenInventory.map((screen) => screen.id), ["balance-page"]);
  assert.deepEqual(model.testReuseAnalysis?.reusableScenarioIds, [analysis.scenarios[0]?.id]);
  assert.deepEqual(model.xrayRepositoryAnalysis?.coverageDelta[0]?.activeTestIssueKeys, ["QE-9001"]);

  const missing = correlateEvidence({
    requirementAnalysis: analysis,
    implementationMappings: [],
    implementationFindings: validateRequirementsAgainstCode(analysis, []),
    confirmedImplementationMappingIds: []
  });
  assert.deepEqual(missing.missingBehaviors.map((behavior) => behavior.acceptanceCriteriaId), ["AC-1"]);
  assert.equal(missing.confidenceScores[0]?.sourceScores.implementation, 0);
  assert.equal(missing.risks.at(-1)?.id, "RISK-EVIDENCE-AC-1");
  const unconfirmed = correlateEvidence({
    requirementAnalysis: analysis,
    implementationMappings: [...implementationMappings],
    implementationFindings,
    confirmedImplementationMappingIds: []
  });
  assert.deepEqual(unconfirmed.confirmedBehaviors, []);
  assert.equal(unconfirmed.confidenceScores[0]?.sourceScores.implementation, 0);
  const evidenceAwareCases = generateTestCases(analysis, [...implementationMappings], model, undefined, testDataModel);
  assert.deepEqual(evidenceAwareCases[0]?.traceability.apiOperationIds, ["getBalance"]);
  assert.deepEqual(evidenceAwareCases[0]?.traceability.historicalIssueKeys, ["QE-80"]);
  assert.deepEqual(evidenceAwareCases[0]?.traceability.adrIds, ["ADR-12"]);
  assert.ok((evidenceAwareCases[0]?.traceability.evidenceIds?.length ?? 0) > 0);
  assert.equal(evidenceAwareCases[0]?.traceability.evidenceConfidence, model.confidenceScores[0]?.score);
  assert.deepEqual(evidenceAwareCases[0]?.traceability.testDataSetIds, [testDataModel.automationDataSets[0]?.id]);
  assert.throws(() => generateTestCases(analysis, [...implementationMappings], { ...model, storyKey: "QE-91" }), /does not match/);

  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-evidence-model-"));
  try {
    const paths = resolveJiraGenerationPaths({
      jiraUrl: "https://jira.example.com/browse/QE-90",
      jiraId: "QE-90",
      repositoryName: "quality/accounts",
      outputFolder: outputDirectory,
      uiGenerationEnabled: false,
      apiGenerationEnabled: false,
      performanceGenerationEnabled: false
    }, join(outputDirectory, "generation-config.json"));
    assert.equal(paths.minimumReadinessScore, 80);
    const xrayPaths = {
      ...paths,
      testManagementTool: "XRAY" as const,
      xrayRepositoryPath: "AI_Generated_tests",
      xrayCreateStoryFolder: true
    };
    const xrayModel = createCanonicalXrayImport(analysis, evidenceAwareCases, xrayPaths, {}, testDataModel);
    assert.deepEqual(xrayModel.tests[0]?.traceability.apiOperationIds, ["getBalance"]);
    assert.deepEqual(xrayModel.tests[0]?.traceability.historicalIssueKeys, ["QE-80"]);
    assert.deepEqual(xrayModel.tests[0]?.traceability.adrIds, ["ADR-12"]);
    assert.ok((xrayModel.tests[0]?.traceability.testDataSetIds.length ?? 0) > 0);
    const xrayArtifacts = await writeXrayImportArtifacts(xrayModel, xrayPaths, "CSV");
    const xrayCsv = await readFile(xrayArtifacts.csvPath!, "utf8");
    const xrayCanonical = await readFile(xrayArtifacts.canonicalJsonPath, "utf8");
    assert.match(xrayCanonical, /getBalance/);
    assert.match(xrayCanonical, /QE-80/);
    assert.match(xrayCanonical, /ADR-12/);
    assert.match(xrayCanonical, /DATASET-/);
    assert.doesNotMatch(xrayCsv, /getBalance|QE-80|ADR-12|DATASET-/);
    const readiness = calculateStoryReadiness("QE-90", {
      requirementConfidence: 100,
      implementationConfidence: 100,
      apiConfidence: 100,
      xrayCoverageConfidence: 100,
      automationConfidence: 100
    }, paths.minimumReadinessScore);
    await writeUnifiedEvidenceForJiraStory(paths, model);
    await writeStoryReadinessForJiraStory(paths, readiness);
    assert.equal(JSON.parse(await readFile(join(paths.jiraFolder, "unified-evidence-model.json"), "utf8")).storyKey, "QE-90");
    assert.equal(JSON.parse(await readFile(join(paths.jiraFolder, "story-readiness.json"), "utf8")).overallReadinessScore, 100);
    await assert.rejects(writeStoryReadinessForJiraStory(paths, { ...readiness, storyKey: "QE-91" }), /does not match/);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("calculates a transparent pre-execution story readiness score", () => {
  const report = calculateStoryReadiness("QE-90", {
    requirementConfidence: 100,
    implementationConfidence: 80,
    apiConfidence: null,
    xrayCoverageConfidence: 60,
    automationConfidence: 80
  });
  assert.equal(report.assessedBeforeExecution, true);
  assert.equal(report.overallReadinessScore, 80);
  assert.equal(report.minimumOverallReadinessScore, 80);
  assert.equal(report.ready, true);
  assert.match(report.formula, /applicable/);
  assert.throws(() => calculateStoryReadiness("QE-90", {
    requirementConfidence: 101,
    implementationConfidence: 80,
    apiConfidence: null,
    xrayCoverageConfidence: 60,
    automationConfidence: 80
  }), /between 0 and 100/);
  assert.equal(calculateStoryReadiness("QE-90", {
    requirementConfidence: 60,
    implementationConfidence: 60,
    apiConfidence: null,
    xrayCoverageConfidence: 60,
    automationConfidence: 60
  }).ready, false);
});

test("classifies failure evidence conservatively and redacts secrets", () => {
  const locatorFailure = analyzeFailure({
    testId: "TC-1",
    error: "locator('#submit').click: element not found; token=sample-secret",
    artifacts: ["playwright-report/trace.zip"]
  });
  assert.equal(locatorFailure.classification, "locator-defect");
  assert.equal(locatorFailure.evidence.join(" ").includes("sample-secret"), false);
  assert.deepEqual(locatorFailure.artifactReferences, ["playwright-report/trace.zip"]);
  assert.equal(analyzeFailure({ testId: "TC-5", error: "TypeError in test code: cannot read property" }).classification, "framework-defect");
  assert.equal(analyzeFailure({ testId: "TC-6", error: "GitHub Actions runner lost" }).classification, "infrastructure-issue");
  assert.equal(analyzeFailure({ testId: "TC-7", error: "ECONNRESET while connecting to test service" }).classification, "environment-issue");
  assert.equal(analyzeFailure({ testId: "TC-8", error: "missing test user in seed data" }).classification, "test-data-issue");
  assert.equal(analyzeFailure({ testId: "TC-2", error: "unexpected termination" }).classification, "undetermined");
  assert.equal(analyzeFailure({ testId: "TC-3", error: "Expected dashboard, actual login page" }).classification, "undetermined");
  assert.equal(analyzeFailure({
    testId: "TC-4",
    observations: ["Confirmed product defect: acceptance criterion AC-1 is violated by the application."]
  }).classification, "product-defect");
});

test("finds flaky, unused, duplicate, weak-locator, and repeatedly failing tests", () => {
  const findings = analyzeTestMaintenance([
    { id: "TC-1", title: "Sign in", steps: ["Submit credentials"], locators: [{ strategy: "xpath", value: "//button[@id='submit']", unique: false }] },
    { id: "TC-2", title: "Sign in", steps: ["Submit credentials"], locators: [{ strategy: "getByRole", value: "button[name=Sign in]", unique: true }] },
    { id: "TC-3", title: "Create order", steps: ["Submit order"], locators: [{ strategy: "getByTestId", value: "create-order", unique: true }] }
  ], [
    { testId: "TC-1", status: "passed", executedAt: "2026-10-01T00:00:00Z" },
    { testId: "TC-1", status: "failed", executedAt: "2026-10-02T00:00:00Z" },
    { testId: "TC-3", status: "failed", executedAt: "2026-10-01T00:00:00Z" },
    { testId: "TC-3", status: "failed", executedAt: "2026-10-02T00:00:00Z" },
    { testId: "TC-3", status: "failed", executedAt: "2026-10-03T00:00:00Z" }
  ], { historyComplete: true, historyWindowStart: "2026-10-01T00:00:00Z" });
  const issueTypes = new Set(findings.map((finding) => finding.type));
  assert.equal(issueTypes.has("flaky-test"), true);
  assert.equal(issueTypes.has("unused-test"), true);
  assert.equal(issueTypes.has("duplicate-test"), true);
  assert.equal(issueTypes.has("weak-locator"), true);
  assert.equal(issueTypes.has("repeated-failure"), true);
});

test("validates a complete trace chain", () => {
  const entities = [
    { id: "STORY-1", type: "story" as const, version: 1, status: "active" as const },
    { id: "REQ-1", type: "requirement" as const, version: 1, status: "active" as const },
    { id: "TC-1", type: "test-case" as const, version: 1, status: "active" as const },
    { id: "AUT-1", type: "automation" as const, version: 1, status: "active" as const },
    { id: "RES-1", type: "execution" as const, version: 1, status: "active" as const },
    { id: "REP-1", type: "report" as const, version: 1, status: "active" as const },
    { id: "BUG-1", type: "defect" as const, version: 1, status: "active" as const }
  ];
  const result = validateTraceability(entities, [
    { id: "L0", relationship: "contains-test-case", sourceId: "STORY-1", sourceVersion: 1, targetId: "TC-1", targetVersion: 1, status: "active" },
    { id: "L1", relationship: "verified-by", sourceId: "REQ-1", sourceVersion: 1, targetId: "TC-1", targetVersion: 1, status: "active" },
    { id: "L2", relationship: "automated-by", sourceId: "TC-1", sourceVersion: 1, targetId: "AUT-1", targetVersion: 1, status: "active" },
    { id: "L3", relationship: "executed-as", sourceId: "AUT-1", sourceVersion: 1, targetId: "RES-1", targetVersion: 1, status: "active" },
    { id: "L4", relationship: "reported-in", sourceId: "RES-1", sourceVersion: 1, targetId: "REP-1", targetVersion: 1, status: "active" },
    { id: "L5", relationship: "detected-defect", sourceId: "RES-1", sourceVersion: 1, targetId: "BUG-1", targetVersion: 1, status: "active" }
  ]);
  assert.equal(result.valid, true);
});
