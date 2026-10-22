import { createHash } from "node:crypto";

export type AutomationRepositoryKind = "ui" | "api";
export type RepositoryAcquisitionStatus = "available" | "not-cloned" | "unavailable" | "unknown";
export type AutomationStrategyKind = "ui" | "api" | "contract" | "component" | "performance";

export interface AutomationRepositoryReference {
  kind: AutomationRepositoryKind;
  repository: string;
  purpose: string;
  ownershipTeam?: string;
}

export interface RepositoryFileEvidence {
  path: string;
  content?: string;
}

export interface ExistingAutomationRepositoryAsset {
  id: string;
  title: string;
  repository: string;
  path: string;
  strategy: AutomationStrategyKind;
  active: boolean;
  coverageStatus: "current" | "historical" | "unknown";
  sourceRevision?: string;
  sourceFingerprint?: string;
  testIssueKeys: string[];
  requirementIds: string[];
  acceptanceCriteriaIds: string[];
  scenarioIds: string[];
  apiIds: string[];
  componentIds: string[];
  businessLogicIds: string[];
  changedFiles: string[];
  suiteIds: string[];
  utilityRefs: string[];
}

export interface ExistingTestAsset {
  id: string;
  title: string;
  source: "xray" | "automation";
  repository?: string;
  path?: string;
  active: boolean;
  coverageStatus: "current" | "historical" | "unknown";
  sourceRevision?: string;
  issueKey?: string;
  strategy?: AutomationStrategyKind;
  requirementIds: string[];
  acceptanceCriteriaIds: string[];
  scenarioIds: string[];
  apiIds: string[];
  componentIds: string[];
  businessLogicIds: string[];
  changedFiles: string[];
  suiteIds: string[];
}

export interface ExistingTestSuite {
  id: string;
  name: string;
  kind: "smoke" | "functional" | "regression" | "api" | "performance" | "other";
  testIds: string[];
  repository?: string;
  path?: string;
}

export interface XrayTestEvidence {
  issueKey: string;
  summary: string;
  active: boolean;
  coverageStatus: "current" | "historical" | "unknown";
  requirementIds: string[];
  acceptanceCriteriaIds: string[];
  scenarioIds: string[];
  apiIds: string[];
  componentIds: string[];
  businessLogicIds: string[];
  suiteIds: string[];
}

export interface PipelineWorkflowEvidence {
  path: string;
  name: string;
  triggers: string[];
  executionCommands: string[];
  environmentVariables: string[];
  reports: string[];
  artifacts: string[];
  actionReferences: string[];
}

export interface AutomationRepositorySnapshot {
  repository: string;
  acquisitionStatus: RepositoryAcquisitionStatus;
  revision?: string;
  defaultBranch?: string;
  files: RepositoryFileEvidence[];
  automation: ExistingAutomationRepositoryAsset[];
  xrayTests: XrayTestEvidence[];
  suites: ExistingTestSuite[];
  workflows: PipelineWorkflowEvidence[];
}

export interface AutomationRepositoryModel {
  schemaVersion: "1.0.0";
  repositories: Array<{
    kind: AutomationRepositoryKind;
    repository: string;
    repositoryOwner: string;
    purpose: string;
    ownershipTeam?: string;
    acquisitionStatus: RepositoryAcquisitionStatus;
    revision?: string;
    defaultBranch?: string;
    inventory: {
      fileCount: number;
      files: string[];
      automationCount: number;
      xrayTestCount: number;
      suiteCount: number;
      workflowCount: number;
      topLevelDirectories: string[];
    };
    warnings: string[];
  }>;
}

export interface FrameworkIntelligenceModel {
  schemaVersion: "1.0.0";
  repositories: Array<{
    repository: string;
    revision?: string;
    programmingLanguages: string[];
    uiFramework: string[];
    apiFramework: string[];
    executionFramework: string[];
    designPatterns: string[];
    assertionLibraries: string[];
    utilities: string[];
    sharedLibraries: string[];
    pageObjects: string[];
    apiClients: string[];
    requestBuilders: string[];
    evidenceFiles: string[];
  }>;
}

export interface RepositoryStandardsModel {
  schemaVersion: "1.0.0";
  repositories: Array<{
    repository: string;
    revision?: string;
    directoryPatterns: string[];
    namingPatterns: string[];
    pageObjectPatterns: string[];
    locatorStrategies: string[];
    utilityPatterns: string[];
    requestBuilderPatterns: string[];
    assertionPatterns: string[];
    evidenceFiles: string[];
  }>;
}

export interface PipelineExecutionModel {
  schemaVersion: "1.0.0";
  repositories: Array<{
    repository: string;
    revision?: string;
    workflows: PipelineWorkflowEvidence[];
    executionCommands: string[];
    environmentVariables: string[];
    reportingMechanisms: string[];
    artifacts: string[];
    githubActionsCompatible: boolean | null;
    compatibilityFindings: string[];
  }>;
}

export interface TestInventoryModel {
  schemaVersion: "1.0.0";
  repositoryRevisions: Array<{ repository: string; revision: string }>;
  tests: ExistingTestAsset[];
  automation: ExistingAutomationRepositoryAsset[];
  suites: ExistingTestSuite[];
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((left, right) => left.localeCompare(right));
}

function normalizedPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function validateAutomationRepositoryReferences(repositories: AutomationRepositoryReference[]): string[] {
  return validateAutomationRepositoryConfiguration(repositories);
}

export function validateAutomationRepositoryConfiguration(value: unknown): string[] {
  const errors: string[] = [];
  const ids = new Set<AutomationRepositoryKind>();
  const repositoryNames = new Set<string>();
  if (!Array.isArray(value)) return ["Automation repositories must be an array when provided."];
  for (const [index, candidate] of value.entries()) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      errors.push(`Automation repository at index ${index} must be an object.`);
      continue;
    }
    const repository = candidate as Record<string, unknown>;
    const kind = repository.kind;
    const name = repository.repository;
    const purpose = repository.purpose;
    if (kind !== "ui" && kind !== "api") errors.push(`Automation repository at index ${index} kind must be ui or api.`);
    else {
      if (ids.has(kind)) errors.push(`Only one configured ${kind} automation repository is supported.`);
      ids.add(kind);
    }
    if (typeof name !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(name)) errors.push(`Automation repository at index ${index} must use owner/name format.`);
    else {
      const normalizedName = name.toLocaleLowerCase("en-US");
      if (repositoryNames.has(normalizedName)) errors.push(`Automation repository is configured more than once: ${name}.`);
      repositoryNames.add(normalizedName);
    }
    if (typeof purpose !== "string" || !purpose.trim()) errors.push(`Automation repository at index ${index} requires a purpose.`);
    if (repository.ownershipTeam !== undefined && (typeof repository.ownershipTeam !== "string" || !repository.ownershipTeam.trim())) {
      errors.push(`Automation repository at index ${index} has an invalid ownership team.`);
    }
    for (const key of Object.keys(repository)) {
      if (!["kind", "repository", "purpose", "ownershipTeam"].includes(key)) errors.push(`Unknown automation repository field at index ${index}: ${key}.`);
    }
  }
  if (!ids.has("ui")) errors.push("A UI automation repository must be configured.");
  if (!ids.has("api")) errors.push("An API automation repository must be configured.");
  return errors;
}

export function discoverAutomationRepositories(
  configured: AutomationRepositoryReference[],
  snapshots: AutomationRepositorySnapshot[]
): AutomationRepositoryModel {
  const configurationErrors = validateAutomationRepositoryReferences(configured);
  if (configurationErrors.length > 0) throw new Error(`Invalid automation repository configuration: ${configurationErrors.join(" ")}`);
  const normalizedSnapshotNames = snapshots.map(({ repository }) => repository.toLocaleLowerCase("en-US"));
  const duplicateSnapshots = snapshots.filter((_, index) => normalizedSnapshotNames.indexOf(normalizedSnapshotNames[index]!) !== index).map(({ repository }) => repository);
  if (duplicateSnapshots.length > 0) throw new Error(`Duplicate automation repository snapshots: ${uniqueSorted(duplicateSnapshots).join(", ")}.`);

  const repositories = configured.map((reference) => {
    const snapshot = snapshots.find((candidate) => candidate.repository.toLowerCase() === reference.repository.toLowerCase());
    if (snapshot && snapshot.automation.some((asset) => asset.repository.toLowerCase() !== reference.repository.toLowerCase())) {
      throw new Error(`Automation inventory contains an asset assigned to another repository: ${reference.repository}.`);
    }
    const directories = uniqueSorted((snapshot?.files ?? []).map(({ path }) => {
      const segments = normalizedPath(path).split("/");
      return segments.length > 1 ? segments[0]! : "";
    }).filter(Boolean));
    return {
      kind: reference.kind,
      repository: reference.repository,
      repositoryOwner: reference.repository.split("/")[0]!,
      purpose: reference.purpose,
      ...(reference.ownershipTeam ? { ownershipTeam: reference.ownershipTeam } : {}),
      acquisitionStatus: snapshot?.acquisitionStatus ?? "not-cloned" as const,
      ...(snapshot?.revision ? { revision: snapshot.revision } : {}),
      ...(snapshot?.defaultBranch ? { defaultBranch: snapshot.defaultBranch } : {}),
      inventory: {
        fileCount: snapshot?.files.length ?? 0,
        files: uniqueSorted((snapshot?.files ?? []).map(({ path }) => normalizedPath(path))),
        automationCount: snapshot?.automation.length ?? 0,
        xrayTestCount: snapshot?.xrayTests.length ?? 0,
        suiteCount: snapshot?.suites.length ?? 0,
        workflowCount: snapshot?.workflows.length ?? 0,
        topLevelDirectories: directories
      },
      warnings: snapshot?.acquisitionStatus === "available" && !snapshot.revision
        ? ["Repository inventory has no immutable source revision."]
        : snapshot ? [] : ["Repository has not been acquired; inventory and framework findings are unavailable."]
    };
  });
  const unexpected = snapshots.filter((snapshot) => !configured.some((item) => item.repository.toLowerCase() === snapshot.repository.toLowerCase()));
  if (unexpected.length > 0) throw new Error(`Snapshots contain unconfigured repositories: ${uniqueSorted(unexpected.map(({ repository }) => repository)).join(", ")}.`);
  return { schemaVersion: "1.0.0", repositories };
}

function fileEvidence(snapshot: AutomationRepositorySnapshot): RepositoryFileEvidence[] {
  return snapshot.files.map((file) => ({ ...file, path: normalizedPath(file.path) }));
}

function matchingFiles(files: RepositoryFileEvidence[], expression: RegExp): string[] {
  return files.filter((file) => expression.test(file.path) || expression.test(file.content ?? "")).map(({ path }) => path);
}

export function analyzeFrameworkIntelligence(snapshots: AutomationRepositorySnapshot[]): FrameworkIntelligenceModel {
  return {
    schemaVersion: "1.0.0",
    repositories: snapshots.map((snapshot) => {
      const files = fileEvidence(snapshot);
      const evidenceFiles = uniqueSorted(files.map(({ path }) => path));
      const source = files.map(({ content }) => content ?? "").join("\n");
      const languageRules: Array<[string, RegExp]> = [
        ["TypeScript", /\.tsx?$/i], ["JavaScript", /\.jsx?$/i], ["Python", /\.py$/i],
        ["Java", /\.java$/i], ["C#", /\.cs$/i], ["Robot Framework", /\.robot$/i], ["Go", /\.go$/i]
      ];
      const programmingLanguages = uniqueSorted(languageRules.filter(([, rule]) => files.some(({ path }) => rule.test(path))).map(([name]) => name));
      const uiFramework = uniqueSorted([
        ...(source.includes("@playwright/test") || evidenceFiles.some((path) => /playwright\.config\./i.test(path)) ? ["Playwright"] : []),
        ...(source.includes("cypress") || evidenceFiles.some((path) => /cypress\.config\./i.test(path)) ? ["Cypress"] : []),
        ...(source.includes("selenium") ? ["Selenium"] : [])
      ]);
      const apiFramework = uniqueSorted([
        ...(source.includes("supertest") ? ["SuperTest"] : []),
        ...(source.includes("axios") ? ["Axios"] : []),
        ...(source.includes("rest-assured") || source.includes("io.restassured") ? ["REST Assured"] : []),
        ...(source.includes("HttpClient") || source.includes("RequestBuilder") ? ["Repository API client"] : [])
      ]);
      const executionFramework = uniqueSorted([
        ...(source.includes("@playwright/test") ? ["Playwright Test"] : []),
        ...(source.includes("vitest") ? ["Vitest"] : []),
        ...(source.includes("jest") ? ["Jest"] : []),
        ...(source.includes("mocha") ? ["Mocha"] : []),
        ...(source.includes("pytest") ? ["pytest"] : []),
        ...(source.includes("robotframework") || evidenceFiles.some((path) => /\.robot$/i.test(path)) ? ["Robot Framework"] : [])
      ]);
      const pageObjects = matchingFiles(files, /(^|\/)(pages?|page[-_]?objects?|components?)\//i);
      const apiClients = matchingFiles(files, /(^|\/)(clients?|http[-_]?clients?)\//i);
      const requestBuilders = matchingFiles(files, /(^|\/)(request[-_]?builders?|builders?)\//i);
      const utilities = matchingFiles(files, /(^|\/)(utils?|utilities|helpers|fixtures)\//i);
      const sharedLibraries = matchingFiles(files, /(^|\/)(shared|common|lib|libraries)\//i);
      const assertionLibraries = uniqueSorted([
        ...(source.includes("expect(") ? ["expect"] : []),
        ...(source.includes("assert.") ? ["assert"] : []),
        ...(source.includes("chai") ? ["Chai"] : []),
        ...(source.includes("jest") ? ["Jest assertions"] : [])
      ]);
      const designPatterns = uniqueSorted([
        ...(pageObjects.length > 0 ? ["Page Object"] : []),
        ...(apiClients.length > 0 ? ["API Client"] : []),
        ...(requestBuilders.length > 0 ? ["Request Builder"] : []),
        ...(utilities.length > 0 ? ["Shared Utility"] : []),
        ...(sharedLibraries.length > 0 ? ["Shared Library"] : [])
      ]);
      return {
        repository: snapshot.repository,
        ...(snapshot.revision ? { revision: snapshot.revision } : {}),
        programmingLanguages,
        uiFramework,
        apiFramework,
        executionFramework,
        designPatterns,
        assertionLibraries,
        utilities,
        sharedLibraries,
        pageObjects,
        apiClients,
        requestBuilders,
        evidenceFiles
      };
    })
  };
}

export function analyzeRepositoryStandards(snapshots: AutomationRepositorySnapshot[]): RepositoryStandardsModel {
  return {
    schemaVersion: "1.0.0",
    repositories: snapshots.map((snapshot) => {
      const files = fileEvidence(snapshot);
      const evidenceFiles = uniqueSorted(files.map(({ path }) => path));
      const source = files.map(({ content }) => content ?? "").join("\n");
      const directoryPatterns = new Set<string>();
      for (const { path } of files) {
        const segments = path.split("/");
        segments.pop();
        for (let depth = 1; depth <= segments.length; depth += 1) directoryPatterns.add(segments.slice(0, depth).join("/"));
      }
      const locatorStrategies = [
        ...(source.includes("getByTestId(") ? ["getByTestId"] : []),
        ...(source.includes("getByRole(") ? ["getByRole"] : []),
        ...(source.includes("getByLabel(") ? ["getByLabel"] : []),
        ...(source.includes("getByPlaceholder(") ? ["getByPlaceholder"] : []),
        ...(source.match(/locator\(['\"](?:[.#[])/g) ? ["CSS"] : []),
        ...(source.includes("xpath=") ? ["XPath"] : [])
      ];
      return {
        repository: snapshot.repository,
        ...(snapshot.revision ? { revision: snapshot.revision } : {}),
        directoryPatterns: uniqueSorted([...directoryPatterns]),
        namingPatterns: uniqueSorted([
          ...(files.some(({ path }) => /\.(spec|test)\.[cm]?[jt]sx?$/i.test(path)) ? ["*.spec.* or *.test.*"] : []),
          ...(files.some(({ path }) => /(^|\/)[A-Z][^/]*Page\.[cm]?[jt]s$/i.test(path)) ? ["PascalCase *Page classes"] : []),
          ...(files.some(({ path }) => /(^|\/)[a-z][^/]*\.(spec|test)\.[cm]?[jt]s$/i.test(path)) ? ["kebab-case test filenames"] : [])
        ]),
        pageObjectPatterns: matchingFiles(files, /(^|\/)(pages?|page[-_]?objects?|components?)\//i),
        locatorStrategies,
        utilityPatterns: matchingFiles(files, /(^|\/)(utils?|utilities|helpers|fixtures)\//i),
        requestBuilderPatterns: matchingFiles(files, /(^|\/)(request[-_]?builders?|builders?)\//i),
        assertionPatterns: uniqueSorted([
          ...(source.includes("expect(") ? ["expect"] : []),
          ...(source.includes("assert.") ? ["assert"] : []),
          ...(source.includes("toHave") ? ["Playwright web-first assertions"] : []),
          ...(source.includes("toEqual") ? ["toEqual"] : [])
        ]),
        evidenceFiles
      };
    })
  };
}

export function analyzePipelineIntelligence(snapshots: AutomationRepositorySnapshot[]): PipelineExecutionModel {
  return {
    schemaVersion: "1.0.0",
    repositories: snapshots.map((snapshot) => {
      const workflows = snapshot.workflows.map((workflow) => ({
        ...workflow,
        triggers: uniqueSorted(workflow.triggers),
        executionCommands: uniqueSorted(workflow.executionCommands),
        environmentVariables: uniqueSorted(workflow.environmentVariables),
        reports: uniqueSorted(workflow.reports),
        artifacts: uniqueSorted(workflow.artifacts),
        actionReferences: uniqueSorted(workflow.actionReferences)
      }));
      const compatibilityFindings = uniqueSorted(workflows.flatMap(({ path, actionReferences: references }) =>
        references.filter((reference) => !/^[^@\s]+@(?:[0-9a-f]{40}|v\d+(?:\.\d+){0,2})$/i.test(reference))
          .map((reference) => `${path}: Action reference is not pinned to a full commit SHA or version tag (${reference}).`)
      ));
      return {
        repository: snapshot.repository,
        ...(snapshot.revision ? { revision: snapshot.revision } : {}),
        workflows,
        executionCommands: uniqueSorted(workflows.flatMap(({ executionCommands }) => executionCommands)),
        environmentVariables: uniqueSorted(workflows.flatMap(({ environmentVariables }) => environmentVariables)),
        reportingMechanisms: uniqueSorted(workflows.flatMap(({ reports }) => reports)),
        artifacts: uniqueSorted(workflows.flatMap(({ artifacts }) => artifacts)),
        githubActionsCompatible: workflows.length === 0 ? null : compatibilityFindings.length === 0,
        compatibilityFindings
      };
    })
  };
}

export function buildTestInventory(snapshots: AutomationRepositorySnapshot[]): TestInventoryModel {
  const automation = snapshots.flatMap(({ automation: assets, acquisitionStatus, revision }) => assets.map((asset) => ({
    ...asset,
    coverageStatus: acquisitionStatus === "available" && revision ? asset.coverageStatus : "unknown" as const,
    ...(revision ? { sourceRevision: revision } : {}),
    testIssueKeys: uniqueSorted(asset.testIssueKeys),
    requirementIds: uniqueSorted(asset.requirementIds),
    acceptanceCriteriaIds: uniqueSorted(asset.acceptanceCriteriaIds),
    scenarioIds: uniqueSorted(asset.scenarioIds),
    apiIds: uniqueSorted(asset.apiIds),
    componentIds: uniqueSorted(asset.componentIds),
    businessLogicIds: uniqueSorted(asset.businessLogicIds),
    changedFiles: uniqueSorted(asset.changedFiles.map(normalizedPath)),
    suiteIds: uniqueSorted(asset.suiteIds),
    utilityRefs: uniqueSorted(asset.utilityRefs)
  })));
  const xrayTests = snapshots.flatMap(({ xrayTests: tests, revision }) => tests.map((test): ExistingTestAsset => ({
    id: test.issueKey,
    issueKey: test.issueKey,
    title: test.summary,
    source: "xray",
    active: test.active,
    coverageStatus: test.coverageStatus,
    ...(revision ? { sourceRevision: revision } : {}),
    requirementIds: uniqueSorted(test.requirementIds),
    acceptanceCriteriaIds: uniqueSorted(test.acceptanceCriteriaIds),
    scenarioIds: uniqueSorted(test.scenarioIds),
    apiIds: uniqueSorted(test.apiIds),
    componentIds: uniqueSorted(test.componentIds),
    businessLogicIds: uniqueSorted(test.businessLogicIds),
    changedFiles: [],
    suiteIds: uniqueSorted(test.suiteIds)
  })));
  const automationTests = automation.map((asset): ExistingTestAsset => ({
    id: asset.id,
    title: asset.title,
    source: "automation",
    repository: asset.repository,
    path: asset.path,
    active: asset.active,
    coverageStatus: asset.coverageStatus,
    ...(asset.sourceRevision ? { sourceRevision: asset.sourceRevision } : {}),
    strategy: asset.strategy,
    requirementIds: asset.requirementIds,
    acceptanceCriteriaIds: asset.acceptanceCriteriaIds,
    scenarioIds: asset.scenarioIds,
    apiIds: asset.apiIds,
    componentIds: asset.componentIds,
    businessLogicIds: asset.businessLogicIds,
    changedFiles: asset.changedFiles,
    suiteIds: asset.suiteIds
  }));
  const suites = snapshots.flatMap(({ suites: values }) => values.map((suite) => ({ ...suite, testIds: uniqueSorted(suite.testIds) })));
  const duplicateIds = [...xrayTests, ...automationTests].map(({ id }) => id).filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateIds.length > 0) throw new Error(`Duplicate existing test identifiers: ${uniqueSorted(duplicateIds).join(", ")}.`);
  const suiteIds = suites.map(({ id }) => id);
  const duplicateSuiteIds = suiteIds.filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateSuiteIds.length > 0) throw new Error(`Duplicate existing suite identifiers: ${uniqueSorted(duplicateSuiteIds).join(", ")}.`);
  const testIds = new Set([...xrayTests, ...automationTests].map(({ id }) => id));
  const unknownSuiteTestIds = suites.flatMap((suite) => suite.testIds.filter((id) => !testIds.has(id)));
  if (unknownSuiteTestIds.length > 0) throw new Error(`Suites reference unknown test identifiers: ${uniqueSorted(unknownSuiteTestIds).join(", ")}.`);
  return {
    schemaVersion: "1.0.0",
    repositoryRevisions: uniqueSorted(snapshots.flatMap(({ repository, revision }) => revision ? [`${repository}\n${revision}`] : []))
      .map((reference) => {
        const [repository, revision] = reference.split("\n");
        return { repository: repository!, revision: revision! };
      }),
    tests: [...xrayTests, ...automationTests],
    automation,
    suites
  };
}

export type CoverageTargetKind = "requirement" | "acceptance-criterion" | "api" | "ui-component" | "business-logic";

export interface CoverageTarget {
  id: string;
  kind: CoverageTargetKind;
  testRequired: boolean;
  automationRequired: boolean;
}

export interface CoverageDiscoveryRow {
  targetId: string;
  targetKind: CoverageTargetKind;
  testRequired: boolean;
  automationRequired: boolean;
  status: "covered" | "partial" | "missing";
  xrayTestIds: string[];
  automationIds: string[];
  missingEvidence: Array<"test" | "automation">;
}

export interface CoverageDiscoveryModel {
  schemaVersion: "1.0.0";
  repositoryRevisions: Array<{ repository: string; revision: string }>;
  rows: CoverageDiscoveryRow[];
  coveredTargetIds: string[];
  partiallyCoveredTargetIds: string[];
  missingTargetIds: string[];
}

function linksTarget(asset: ExistingTestAsset, target: CoverageTarget): boolean {
  switch (target.kind) {
    case "requirement": return asset.requirementIds.includes(target.id);
    case "acceptance-criterion": return asset.acceptanceCriteriaIds.includes(target.id);
    case "api": return asset.apiIds.includes(target.id);
    case "ui-component": return asset.componentIds.includes(target.id);
    case "business-logic": return asset.businessLogicIds.includes(target.id);
  }
}

export function discoverCoverage(targets: CoverageTarget[], inventory: TestInventoryModel): CoverageDiscoveryModel {
  const seen = new Set<string>();
  const rows = targets.map((target): CoverageDiscoveryRow => {
    if (!target.id.trim()) throw new Error("Coverage targets require a stable identifier.");
    if (!target.testRequired && !target.automationRequired) throw new Error(`Coverage target ${target.id} must require a test, automation, or both.`);
    const key = `${target.kind}:${target.id}`;
    if (seen.has(key)) throw new Error(`Duplicate coverage target: ${key}.`);
    seen.add(key);
    const matching = inventory.tests.filter((test) => test.active && test.coverageStatus === "current" && linksTarget(test, target));
    const xrayTestIds = uniqueSorted(matching.filter((test) => test.source === "xray").map(({ id }) => id));
    const automationIds = uniqueSorted(matching.filter((test) => test.source === "automation").map(({ id }) => id));
    const missingEvidence: CoverageDiscoveryRow["missingEvidence"] = [];
    if (target.testRequired && xrayTestIds.length === 0) missingEvidence.push("test");
    if (target.automationRequired && automationIds.length === 0) missingEvidence.push("automation");
    const hasEvidence = xrayTestIds.length > 0 || automationIds.length > 0;
    return {
      targetId: target.id,
      targetKind: target.kind,
      testRequired: target.testRequired,
      automationRequired: target.automationRequired,
      status: missingEvidence.length === 0 ? "covered" : hasEvidence ? "partial" : "missing",
      xrayTestIds,
      automationIds,
      missingEvidence
    };
  });
  return {
    schemaVersion: "1.0.0",
    repositoryRevisions: inventory.repositoryRevisions.map((reference) => ({ ...reference })),
    rows,
    coveredTargetIds: rows.filter(({ status }) => status === "covered").map(({ targetId }) => targetId),
    partiallyCoveredTargetIds: rows.filter(({ status }) => status === "partial").map(({ targetId }) => targetId),
    missingTargetIds: rows.filter(({ status }) => status === "missing").map(({ targetId }) => targetId)
  };
}

export interface RegressionImpactInput {
  changedFiles: string[];
  changedApiIds: string[];
  changedComponentIds: string[];
  changedBusinessLogicIds: string[];
  inventory: TestInventoryModel;
}

export interface RegressionImpactModel {
  schemaVersion: "1.0.0";
  repositoryRevisions: Array<{ repository: string; revision: string }>;
  impactedTestIds: string[];
  impactedSuiteIds: string[];
  impactedRepositories: string[];
  impactedRegressionScope: string[];
  unmatchedChangedFiles: string[];
  requiresFullRegression: boolean;
}

export function analyzeRegressionImpact(input: RegressionImpactInput): RegressionImpactModel {
  const changedFiles = new Set(input.changedFiles.map(normalizedPath));
  const changedApiIds = new Set(input.changedApiIds);
  const changedComponentIds = new Set(input.changedComponentIds);
  const changedBusinessLogicIds = new Set(input.changedBusinessLogicIds);
  const impacted = input.inventory.tests.filter((test) => test.active && (
    test.changedFiles.some((path) => changedFiles.has(normalizedPath(path))) ||
    test.apiIds.some((id) => changedApiIds.has(id)) ||
    test.componentIds.some((id) => changedComponentIds.has(id)) ||
    test.businessLogicIds.some((id) => changedBusinessLogicIds.has(id))
  ));
  const explicitlyMappedFiles = new Set(input.inventory.tests.filter(({ active }) => active).flatMap((test) => test.changedFiles.map(normalizedPath)));
  const unmatchedChangedFiles = uniqueSorted([...changedFiles].filter((path) => !explicitlyMappedFiles.has(path)));
  const suites = new Set(impacted.flatMap(({ suiteIds }) => suiteIds));
  for (const suite of input.inventory.suites) {
    if (suite.testIds.some((testId) => impacted.some(({ id }) => id === testId))) suites.add(suite.id);
  }
  const impactedScope = new Set<string>();
  for (const test of impacted) {
    if (test.strategy) impactedScope.add(test.strategy);
    else if (test.source === "xray") impactedScope.add("functional");
  }
  if (unmatchedChangedFiles.length > 0) impactedScope.add("full-regression");
  return {
    schemaVersion: "1.0.0",
    repositoryRevisions: input.inventory.repositoryRevisions.map((reference) => ({ ...reference })),
    impactedTestIds: uniqueSorted(impacted.map(({ id }) => id)),
    impactedSuiteIds: uniqueSorted([...suites]),
    impactedRepositories: uniqueSorted(impacted.map(({ repository }) => repository ?? "").filter(Boolean)),
    impactedRegressionScope: uniqueSorted([...impactedScope]),
    unmatchedChangedFiles,
    requiresFullRegression: unmatchedChangedFiles.length > 0
  };
}

export interface CoverageDeltaModel extends CoverageDiscoveryModel {
  changedTargetIds: string[];
  impactedCoveredTargetIds: string[];
  impactedPartialTargetIds: string[];
  impactedMissingTargetIds: string[];
}

export function analyzeCoverageDelta(discovery: CoverageDiscoveryModel, changedTargetIds: string[]): CoverageDeltaModel {
  const changed = new Set(changedTargetIds);
  const rows = discovery.rows.map((row) => ({ ...row, missingEvidence: [...row.missingEvidence] }));
  const impactedRows = rows.filter(({ targetId }) => changed.has(targetId));
  const knownIds = new Set(rows.map(({ targetId }) => targetId));
  const unknown = [...changed].filter((id) => !knownIds.has(id));
  if (unknown.length > 0) throw new Error(`Coverage delta references unknown targets: ${uniqueSorted(unknown).join(", ")}.`);
  return {
    ...discovery,
    rows,
    changedTargetIds: uniqueSorted([...changed]),
    impactedCoveredTargetIds: impactedRows.filter(({ status }) => status === "covered").map(({ targetId }) => targetId),
    impactedPartialTargetIds: impactedRows.filter(({ status }) => status === "partial").map(({ targetId }) => targetId),
    impactedMissingTargetIds: impactedRows.filter(({ status }) => status === "missing").map(({ targetId }) => targetId)
  };
}

export interface ReuseGenerationDecision {
  targetId: string;
  action: "reuse-existing-test-and-automation" | "reuse-existing-coverage" | "reuse-test-generate-automation" | "reuse-automation-generate-test" | "extend-existing" | "generate-missing-test-case" | "generate-missing-automation" | "generate-missing-test-and-automation";
  testIds: string[];
  automationIds: string[];
  missingEvidence: Array<"test" | "automation">;
  rationale: string;
}

export interface ReuseGenerationStrategy {
  schemaVersion: "1.0.0";
  repositoryRevisions: Array<{ repository: string; revision: string }>;
  phases: Array<"reuse-existing-tests" | "reuse-existing-automation" | "extend-existing-tests" | "extend-existing-automation" | "generate-missing-test-cases" | "generate-missing-automation">;
  decisions: ReuseGenerationDecision[];
  testGenerationTargetIds: string[];
  automationGenerationTargetIds: string[];
  extensionTargetIds: string[];
}

export function buildReuseFirstStrategy(coverage: CoverageDiscoveryModel): ReuseGenerationStrategy {
  const decisions = coverage.rows.map((row): ReuseGenerationDecision => {
    const hasTests = row.xrayTestIds.length > 0;
    const hasAutomation = row.automationIds.length > 0;
    if (row.status === "covered" && hasTests && hasAutomation) return {
      targetId: row.targetId,
      action: "reuse-existing-test-and-automation",
      testIds: row.xrayTestIds,
      automationIds: row.automationIds,
      missingEvidence: [],
      rationale: "Explicit active Xray and automation links cover this target."
    };
    if (row.status === "covered") return {
      targetId: row.targetId,
      action: "reuse-existing-coverage",
      testIds: row.xrayTestIds,
      automationIds: row.automationIds,
      missingEvidence: [],
      rationale: "Existing active evidence satisfies all required coverage for this target."
    };
    if (hasTests && row.missingEvidence.length === 1 && row.missingEvidence[0] === "automation") return {
      targetId: row.targetId,
      action: "reuse-test-generate-automation",
      testIds: row.xrayTestIds,
      automationIds: [],
      missingEvidence: [...row.missingEvidence],
      rationale: "Reuse the linked test case; create automation only for the missing automation coverage."
    };
    if (hasAutomation && row.missingEvidence.length === 1 && row.missingEvidence[0] === "test") return {
      targetId: row.targetId,
      action: "reuse-automation-generate-test",
      testIds: [],
      automationIds: row.automationIds,
      missingEvidence: [...row.missingEvidence],
      rationale: "Reuse the linked automation; create a test case only for the missing test coverage."
    };
    if (row.status === "partial") return {
      targetId: row.targetId,
      action: "extend-existing",
      testIds: row.xrayTestIds,
      automationIds: row.automationIds,
      missingEvidence: [...row.missingEvidence],
      rationale: "Existing linked evidence covers only part of the target; extend it without duplicating covered behavior."
    };
    if (row.missingEvidence.length === 1 && row.missingEvidence[0] === "test") return {
      targetId: row.targetId,
      action: "generate-missing-test-case",
      testIds: [],
      automationIds: [],
      missingEvidence: [...row.missingEvidence],
      rationale: "Only test-case coverage is missing for this target."
    };
    if (row.missingEvidence.length === 1 && row.missingEvidence[0] === "automation") return {
      targetId: row.targetId,
      action: "generate-missing-automation",
      testIds: row.xrayTestIds,
      automationIds: [],
      missingEvidence: [...row.missingEvidence],
      rationale: "Only automation coverage is missing for this target."
    };
    return {
      targetId: row.targetId,
      action: "generate-missing-test-and-automation",
      testIds: [],
      automationIds: [],
      missingEvidence: [...row.missingEvidence],
      rationale: "No active explicit test or automation links were found for this target."
    };
  });
  return {
    schemaVersion: "1.0.0",
    repositoryRevisions: coverage.repositoryRevisions.map((reference) => ({ ...reference })),
    phases: ["reuse-existing-tests", "reuse-existing-automation", "extend-existing-tests", "extend-existing-automation", "generate-missing-test-cases", "generate-missing-automation"],
    decisions,
    testGenerationTargetIds: decisions.filter(({ missingEvidence }) => missingEvidence.includes("test")).map(({ targetId }) => targetId),
    automationGenerationTargetIds: decisions.filter(({ missingEvidence }) => missingEvidence.includes("automation")).map(({ targetId }) => targetId),
    extensionTargetIds: decisions.filter(({ action }) => action === "extend-existing").map(({ targetId }) => targetId)
  };
}

export interface SmartRegressionRecommendation {
  schemaVersion: "1.0.0";
  repositoryRevisions: Array<{ repository: string; revision: string }>;
  scope: "impacted" | "full-regression";
  executionContext?: {
    targetEnvironment?: string;
    art?: "REX" | "RAM";
    programIncrement?: string;
  };
  recommendedSmokeTestIds: string[];
  recommendedFunctionalTestIds: string[];
  recommendedRegressionTestIds: string[];
  recommendedApiTestIds: string[];
  recommendedPerformanceTestIds: string[];
  impactedSuiteIds: string[];
  recommendedSuiteIds: string[];
  impactedRepositories: string[];
  rationale: string[];
}

export function buildSmartRegressionRecommendation(
  inventory: TestInventoryModel,
  impact: RegressionImpactModel,
  executionContext?: SmartRegressionRecommendation["executionContext"]
): SmartRegressionRecommendation {
  const impacted = new Set(impact.impactedTestIds);
  const activeTestIds = new Set(inventory.tests.filter(({ active }) => active).map(({ id }) => id));
  const bySuiteKind = (kind: ExistingTestSuite["kind"]): string[] => uniqueSorted(inventory.suites
    .filter((suite) => suite.kind === kind && (impact.requiresFullRegression || suite.testIds.some((testId) => impacted.has(testId))))
    .flatMap(({ testIds }) => testIds.filter((testId) => activeTestIds.has(testId) && (impact.requiresFullRegression || impacted.has(testId)))));
  const impactedTests = inventory.tests.filter((test) => impacted.has(test.id));
  const apiIds = impactedTests.filter(({ strategy }) => strategy === "api" || strategy === "contract").map(({ id }) => id);
  const performanceIds = impactedTests.filter(({ strategy }) => strategy === "performance").map(({ id }) => id);
  const functionalIds = impactedTests.filter(({ strategy }) => strategy !== "performance").map(({ id }) => id);
  const recommendedSmokeTestIds = bySuiteKind("smoke");
  const recommendedFunctionalTestIds = uniqueSorted([...bySuiteKind("functional"), ...functionalIds]);
  const recommendedRegressionTestIds = impact.requiresFullRegression
    ? uniqueSorted(inventory.tests.filter(({ active }) => active).map(({ id }) => id))
    : uniqueSorted([...bySuiteKind("regression"), ...impact.impactedTestIds]);
  const recommendedApiTestIds = uniqueSorted([...bySuiteKind("api"), ...apiIds]);
  const recommendedPerformanceTestIds = uniqueSorted([...bySuiteKind("performance"), ...performanceIds]);
  const recommendedTestIds = new Set([
    ...recommendedSmokeTestIds,
    ...recommendedFunctionalTestIds,
    ...recommendedRegressionTestIds,
    ...recommendedApiTestIds,
    ...recommendedPerformanceTestIds
  ]);
  return {
    schemaVersion: "1.0.0",
    repositoryRevisions: impact.repositoryRevisions.map((reference) => ({ ...reference })),
    scope: impact.requiresFullRegression ? "full-regression" : "impacted",
    ...(executionContext ? { executionContext: { ...executionContext } } : {}),
    recommendedSmokeTestIds,
    recommendedFunctionalTestIds,
    recommendedRegressionTestIds,
    recommendedApiTestIds,
    recommendedPerformanceTestIds,
    impactedSuiteIds: impact.impactedSuiteIds,
    recommendedSuiteIds: uniqueSorted(inventory.suites.filter((suite) => suite.testIds.some((testId) => recommendedTestIds.has(testId))).map(({ id }) => id)),
    impactedRepositories: impact.impactedRepositories,
    rationale: impact.requiresFullRegression
      ? ["At least one changed file has no explicit test/source mapping; recommend full regression."]
      : ["Recommendations include only active tests linked to changed files, APIs, UI components, or business-logic identifiers."]
  };
}

export interface ReuseGovernanceInput {
  analyzed: {
    repositories: boolean;
    frameworks: boolean;
    standards: boolean;
    pipelines: boolean;
    tests: boolean;
    automation: boolean;
    xray: boolean;
    suites: boolean;
  };
  inventory: TestInventoryModel;
  strategy: ReuseGenerationStrategy;
  existingUtilities?: string[];
  proposedTests: Array<{ id: string; title: string; acceptanceCriteriaIds: string[]; scenarioIds: string[] }>;
  proposedAutomation: Array<{ id: string; path: string; source: string; sourceFingerprint?: string; utilityRefs: string[] }>;
  proposedUtilities: string[];
  proposedRegressionCoverageIds?: string[];
}

export interface ReuseGovernanceReport {
  schemaVersion: "1.0.0";
  decision: "PASS" | "BLOCK";
  analyzed: ReuseGovernanceInput["analyzed"];
  findings: Array<{ id: string; category: string; severity: "critical"; description: string; evidence: string[] }>;
  blockedGenerationTargetIds: string[];
}

function normalizedSignature(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

export function validateReuseGovernance(input: ReuseGovernanceInput): ReuseGovernanceReport {
  const findings: ReuseGovernanceReport["findings"] = [];
  for (const [area, wasAnalyzed] of Object.entries(input.analyzed)) {
    if (!wasAnalyzed) findings.push({
      id: `REUSE-ANALYSIS-${area.toUpperCase()}`,
      category: "analysis-incomplete",
      severity: "critical",
      description: `Existing ${area} must be analyzed before generation.`,
      evidence: []
    });
  }
  const testOwners = new Map<string, string[]>();
  for (const test of input.proposedTests) {
    const signature = `${normalizedSignature(test.title)}::${uniqueSorted(test.acceptanceCriteriaIds).join("|")}::${uniqueSorted(test.scenarioIds).join("|")}`;
    testOwners.set(signature, [...(testOwners.get(signature) ?? []), test.id]);
    const duplicate = input.inventory.tests.find((existing) => existing.active &&
      normalizedSignature(existing.title) === normalizedSignature(test.title) &&
      uniqueSorted(existing.acceptanceCriteriaIds).join("|") === uniqueSorted(test.acceptanceCriteriaIds).join("|") &&
      uniqueSorted(existing.scenarioIds).join("|") === uniqueSorted(test.scenarioIds).join("|"));
    if (duplicate) findings.push({
      id: `REUSE-DUPLICATE-TEST-${test.id}`,
      category: "duplicate-test",
      severity: "critical",
      description: `Proposed test duplicates active existing test ${duplicate.id}.`,
      evidence: [duplicate.id, test.id]
    });
  }
  for (const [signature, ids] of testOwners) {
    if (ids.length > 1) findings.push({
      id: `REUSE-DUPLICATE-PROPOSED-TEST-${ids.join("-")}`,
      category: "duplicate-test",
      severity: "critical",
      description: "Proposed tests duplicate one another by normalized title and explicit traceability links.",
      evidence: [signature, ...ids]
    });
  }
  const automationSignatures = new Map<string, string[]>();
  for (const automation of input.proposedAutomation) {
    const signature = automation.source.trim();
    automationSignatures.set(signature, [...(automationSignatures.get(signature) ?? []), automation.id]);
    const path = normalizedPath(automation.path).toLocaleLowerCase("en-US");
    if (input.inventory.automation.some((existing) => existing.active && normalizedPath(existing.path).toLocaleLowerCase("en-US") === path)) {
      findings.push({
        id: `REUSE-DUPLICATE-AUTOMATION-${automation.id}`,
        category: "duplicate-automation",
        severity: "critical",
        description: `Proposed automation path already exists: ${automation.path}.`,
        evidence: [automation.path]
      });
    }
    const fingerprint = automation.sourceFingerprint?.toLocaleLowerCase("en-US") ?? createHash("sha256").update(automation.source).digest("hex");
    const duplicateContent = input.inventory.automation.find((existing) => existing.active && existing.sourceFingerprint?.toLocaleLowerCase("en-US") === fingerprint);
    if (duplicateContent) findings.push({
      id: `REUSE-DUPLICATE-AUTOMATION-CONTENT-${automation.id}`,
      category: "duplicate-automation",
      severity: "critical",
      description: `Proposed automation has identical content to existing automation ${duplicateContent.id}.`,
      evidence: [duplicateContent.id, automation.id]
    });
  }
  for (const ids of automationSignatures.values()) {
    if (ids.length > 1) findings.push({
      id: `REUSE-DUPLICATE-AUTOMATION-CONTENT-${ids.join("-")}`,
      category: "duplicate-automation",
      severity: "critical",
      description: "Proposed automation assets contain identical source.",
      evidence: ids
    });
  }
  const reusableUtilities = new Set([
    ...input.inventory.automation.flatMap((asset) => asset.utilityRefs),
    ...(input.existingUtilities ?? [])
  ].map(normalizedSignature));
  for (const utility of uniqueSorted(input.proposedUtilities)) {
    if (reusableUtilities.has(normalizedSignature(utility))) findings.push({
      id: `REUSE-DUPLICATE-UTILITY-${normalizedSignature(utility).replaceAll(" ", "-")}`,
      category: "duplicate-utility",
      severity: "critical",
      description: `Proposed utility duplicates an existing shared utility: ${utility}.`,
      evidence: [utility]
    });
  }
  const generatedTargets = new Set([...input.strategy.testGenerationTargetIds, ...input.strategy.automationGenerationTargetIds]);
  const regressionCoverageOwners = new Map<string, number>();
  for (const targetId of input.proposedRegressionCoverageIds ?? []) {
    regressionCoverageOwners.set(targetId, (regressionCoverageOwners.get(targetId) ?? 0) + 1);
  }
  for (const [targetId, count] of regressionCoverageOwners) {
    if (count > 1) findings.push({
      id: `REUSE-DUPLICATE-REGRESSION-COVERAGE-${targetId}`,
      category: "duplicate-regression-coverage",
      severity: "critical",
      description: `The proposed regression suite maps the same coverage target ${count} times.`,
      evidence: [targetId]
    });
  }
  for (const decision of input.strategy.decisions) {
    if (decision.action === "reuse-existing-test-and-automation" && generatedTargets.has(decision.targetId)) findings.push({
      id: `REUSE-REDUNDANT-COVERAGE-${decision.targetId}`,
      category: "duplicate-regression-coverage",
      severity: "critical",
      description: "A target with active reusable test and automation is included in generation scope.",
      evidence: [...decision.testIds, ...decision.automationIds]
    });
  }
  const blockedGenerationTargetIds = uniqueSorted(findings.flatMap((finding) => {
    const target = finding.id.match(/^REUSE-(?:REDUNDANT-COVERAGE)-(.+)$/)?.[1];
    return target ? [target] : [];
  }));
  return {
    schemaVersion: "1.0.0",
    decision: findings.length === 0 ? "PASS" : "BLOCK",
    analyzed: { ...input.analyzed },
    findings,
    blockedGenerationTargetIds
  };
}

export interface ExistingTestIntelligenceArtifacts {
  repositories: AutomationRepositoryModel;
  frameworks: FrameworkIntelligenceModel;
  standards: RepositoryStandardsModel;
  pipelines: PipelineExecutionModel;
  inventory: TestInventoryModel;
  coverage: CoverageDiscoveryModel;
  regressionImpact: RegressionImpactModel;
  coverageDelta: CoverageDeltaModel;
  reuseStrategy: ReuseGenerationStrategy;
  reuseGovernance: ReuseGovernanceReport;
  executionRecommendation: SmartRegressionRecommendation;
}