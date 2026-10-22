import type { JiraTestManagementTool } from "../storage/generation.js";
import type { Priority, RequirementAnalysis } from "../models/requirements.js";
import type { StandardTestCase } from "../models/test-cases.js";
import { writeApiIntelligenceReport } from "../reporting/generator.js";
import type { ApiContractOperation, ApiDiscoveryResult } from "./contracts.js";

export type ApiRiskLevel = "critical" | "high" | "medium" | "low";
export type ApiTestCategory =
  | "positive"
  | "negative"
  | "boundary"
  | "authentication"
  | "authorization"
  | "error-handling"
  | "contract-validation"
  | "schema-validation"
  | "request-validation";

export interface ApiRequirementMapping {
  operationId: string;
  requirementIds: string[];
  acceptanceCriteriaIds: string[];
  evidence: string[];
}

export interface ApiCodeMapping {
  operationId: string;
  repository: string;
  branch: string;
  commit: string;
  pullRequest?: string;
  controllerFiles: string[];
  serviceFiles: string[];
  businessLogicFiles: string[];
  validationFiles: string[];
  changedFileCount: number;
  evidence: string[];
}

export interface ApiAutomationReference {
  operationId: string;
  testCaseId: string;
  scriptPath: string;
  automationId: string;
}

export interface ApiXrayTestCase {
  id: string;
  testCaseId?: string;
  operationId: string;
  implementationReferences: string[];
  category: ApiTestCategory;
  summary: string;
  objective: string;
  preconditions: string[];
  sourceRequirement: string;
  expectedOutcome: string;
  action: string;
  data: string;
  expectedResult: string;
}

export interface ApiCoverageDimension {
  total: number;
  covered: number;
  notApplicable: number;
  coveragePercent: number;
}

export interface ApiCoverageRow {
  operationId: string;
  method: string;
  path: string;
  requirementIds: string[];
  codeMapped: boolean;
  testCaseIds: string[];
  automationIds: string[];
  risk: ApiRiskLevel;
  dimensions: {
    endpoint: boolean;
    method: boolean;
    request: boolean | null;
    response: boolean | null;
    validation: boolean | null;
    errorHandling: boolean | null;
    security: boolean | null;
  };
}

export interface ApiAutomationPlan {
  operationId: string;
  scriptName: string;
  testCaseIds: string[];
  reusableUtilities: string[];
  testData: string[];
  environmentVariables: string[];
  requestBuilder: string;
  contractReferences: string[];
}

export interface ApiGovernancePolicy {
  minCriticalApiCoveragePercent: number;
  minAuthenticationCoveragePercent: number;
  minHighRiskEndpointCoveragePercent: number;
  minContractCoveragePercent: number;
}

export const defaultApiGovernancePolicy: ApiGovernancePolicy = {
  minCriticalApiCoveragePercent: 100,
  minAuthenticationCoveragePercent: 100,
  minHighRiskEndpointCoveragePercent: 100,
  minContractCoveragePercent: 95
};

export interface ApiIntelligenceInput {
  storyKey: string;
  requirementAnalysis: RequirementAnalysis;
  discovery: ApiDiscoveryResult;
  requirementMappings: ApiRequirementMapping[];
  codeMappings: ApiCodeMapping[];
  generatedTestCases: StandardTestCase[];
  automationReferences: ApiAutomationReference[];
  xrayEnabled?: boolean;
  testManagementTool?: JiraTestManagementTool | "";
  governancePolicy?: Partial<ApiGovernancePolicy>;
}

export interface ApiIntelligenceReport {
  schemaVersion: "1.0.0";
  storyKey: string;
  discovery: { portals: ApiDiscoveryResult["portals"]; duplicateOperationIds: string[]; errors: string[] };
  discoveredOperations: ApiContractOperation[];
  requirementToApi: Array<{ requirementId: string; acceptanceCriteriaIds: string[]; operationIds: string[]; covered: boolean }>;
  apiToCode: Array<{ operationId: string; repository: string; branch: string; commit: string; pullRequest?: string; controllerFiles: string[]; serviceFiles: string[]; businessLogicFiles: string[]; validationFiles: string[]; mapped: boolean }>;
  risks: Array<{ operationId: string; level: ApiRiskLevel; reasons: string[]; recommendations: string[] }>;
  xrayTestCases: ApiXrayTestCase[];
  automationPlan: ApiAutomationPlan[];
  coverageRows: ApiCoverageRow[];
  coverage: {
    endpoints: ApiCoverageDimension;
    methods: ApiCoverageDimension;
    requests: ApiCoverageDimension;
    responses: ApiCoverageDimension;
    validations: ApiCoverageDimension;
    errors: ApiCoverageDimension;
    security: ApiCoverageDimension;
    criticalApis: ApiCoverageDimension;
    highRiskEndpoints: ApiCoverageDimension;
  };
  gaps: Array<{ id: string; type: string; operationId: string; description: string; recommendation: string; priority: Priority }>;
  governance: { ready: boolean; policy: ApiGovernancePolicy; notApplicable: string[]; failures: string[] };
  executiveMetrics: { apiCoveragePercent: number; contractCoveragePercent: number; requirementCorrelationPercent: number; implementationCoveragePercent: number; riskCoveragePercent: number; generatedXrayTestCount: number; plannedScriptCount: number; readinessScore: number };
}

interface RequirementRecord {
  id: string;
  acceptanceCriteriaIds: string[];
  priority: Priority;
}

const priorityValue: Record<Priority, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function requirementRecords(analysis: RequirementAnalysis): RequirementRecord[] {
  const statements = [
    ...(analysis.functionalRequirements ?? []),
    ...(analysis.nonFunctionalRequirements ?? []),
    ...(analysis.businessRules ?? []),
    ...(analysis.validationRules ?? []),
    ...(analysis.implicitRequirements ?? []),
    ...(analysis.risks ?? [])
  ];
  return statements.map((statement) => {
    const priorities = analysis.scenarios
      .filter((scenario) => scenario.acceptanceCriteriaIds.some((id) => statement.acceptanceCriteriaIds.includes(id)))
      .map((scenario) => scenario.priority);
    const risk = analysis.risks?.find((entry) => entry.id === statement.id);
    const priority = risk?.priority ?? priorities.reduce<Priority>((best, item) => priorityValue[item] > priorityValue[best] ? item : best, "low");
    return { id: statement.id, acceptanceCriteriaIds: [...statement.acceptanceCriteriaIds], priority };
  });
}

function summarizeCoverage(total: number, covered: number, notApplicable = 0): ApiCoverageDimension {
  const denominator = total - notApplicable;
  return { total, covered, notApplicable, coveragePercent: denominator <= 0 ? 0 : Math.round((covered / denominator) * 100) };
}

function apiRisk(
  operation: ApiContractOperation,
  requirementIds: string[],
  codeMapping: ApiCodeMapping | undefined,
  requirements: Map<string, RequirementRecord>
): { level: ApiRiskLevel; reasons: string[]; recommendations: string[] } {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const linkedRequirements = requirementIds.map((id) => requirements.get(id)).filter((item): item is RequirementRecord => Boolean(item));
  const hasCriticalRequirement = linkedRequirements.some((item) => item.priority === "critical");
  const sensitive = /security|auth|payment|financial|personal|sensitive|credential|identity/i.test(`${operation.tags.join(" ")} ${operation.summary} ${operation.description}`);
  const authSensitive = operation.authentication !== "none" || operation.securityScopes.length > 0;
  const broadChange = (codeMapping?.changedFileCount ?? 0) >= 5;
  const highImpactRequirement = linkedRequirements.some((item) => item.priority === "high" || item.priority === "critical");
  if (hasCriticalRequirement) reasons.push("Linked to a critical requirement.");
  if (authSensitive) reasons.push(`Uses ${operation.authentication} authentication or scoped authorization.`);
  if (sensitive) reasons.push("Operation description/tags indicate a security- or business-sensitive domain.");
  if (broadChange) reasons.push(`Implementation spans ${codeMapping?.changedFileCount} changed files.`);
  if (highImpactRequirement) reasons.push("Linked to a high/critical business requirement.");
  if (!codeMapping) reasons.push("No API-to-code implementation mapping was supplied.");
  const level: ApiRiskLevel = hasCriticalRequirement && (authSensitive || sensitive) ? "critical"
    : authSensitive || sensitive || hasCriticalRequirement || broadChange ? "high"
      : highImpactRequirement || operation.errorResponses.length > 0 ? "medium" : "low";
  if (level === "critical" || level === "high") recommendations.push("Add positive, negative, authentication/authorization, contract, and error-response tests before promotion.");
  if (operation.requestSchema || operation.queryParameters.length > 0) recommendations.push("Add request-schema and boundary validation coverage.");
  if (operation.errorResponses.length > 0) recommendations.push("Exercise every documented error status and response schema.");
  return { level, reasons, recommendations };
}

function categoryForScenarioType(type: string): ApiTestCategory {
  if (type === "negative") return "negative";
  if (type === "boundary") return "boundary";
  if (type === "validation") return "request-validation";
  if (type === "security" || type === "authorization") return "authorization";
  return "positive";
}

function generateApiXrayCases(
  storyKey: string,
  operations: ApiContractOperation[],
  requirementMappings: ApiRequirementMapping[],
  codeMappings: ApiCodeMapping[],
  generatedTestCases: StandardTestCase[]
): ApiXrayTestCase[] {
  const mappedCases = new Map<string, StandardTestCase[]>();
  for (const mapping of requirementMappings) {
    const cases = generatedTestCases.filter((testCase) => testCase.traceability.acceptanceCriteriaIds.some((criterionId) => mapping.acceptanceCriteriaIds.includes(criterionId)));
    const current = mappedCases.get(mapping.operationId) ?? [];
    current.push(...cases);
    mappedCases.set(mapping.operationId, current);
  }
  const output: ApiXrayTestCase[] = [];
  const seen = new Set<string>();
  const add = (operation: ApiContractOperation, category: ApiTestCategory, testCase: StandardTestCase | undefined, suffix: string, expected: string): void => {
    const key = `${operation.operationId}:${category}:${testCase?.id ?? suffix}`;
    if (seen.has(key)) return;
    seen.add(key);
    const mappedRequirements = requirementMappings.filter((mapping) => mapping.operationId === operation.operationId);
    const requirementText = [...new Set(mappedRequirements.flatMap((mapping) => mapping.requirementIds))].join(", ") || "Requirement mapping required";
    const codeMapping = codeMappings.find((mapping) => mapping.operationId === operation.operationId);
    const implementationReferences = codeMapping ? [
      ...codeMapping.controllerFiles,
      ...codeMapping.serviceFiles,
      ...codeMapping.businessLogicFiles,
      ...codeMapping.validationFiles
    ] : [];
    const xraySequence = output.length + 1;
    const testCaseId = `[${storyKey}][API-${String(xraySequence).padStart(2, "0")}]`;
    const action = `${operation.method} ${operation.path}${testCase ? `; verify ${testCase.title}` : `; verify ${category} behavior`}`;
    const data = operation.requestSchema ? `Use approved synthetic data conforming to ${operation.requestSchema.name}.` : "Use approved synthetic API test data; do not include credentials.";
    output.push({
      id: testCaseId,
      ...(testCase ? { testCaseId: testCase.id } : {}),
      operationId: operation.operationId,
      implementationReferences,
      category,
      summary: `[${operation.method}] ${operation.path} ${category}`,
      objective: `Validate ${category} behavior for ${operation.operationId}.`,
      preconditions: ["API environment and access are configured; test data is isolated."],
      sourceRequirement: requirementText,
      expectedOutcome: expected,
      action,
      data,
      expectedResult: expected
    });
  };

  for (const operation of operations) {
    const operationMappings = requirementMappings.filter((mapping) => mapping.operationId === operation.operationId);
    const hasCodeMapping = codeMappings.some((mapping) => mapping.operationId === operation.operationId &&
      mapping.controllerFiles.length + mapping.serviceFiles.length + mapping.businessLogicFiles.length + mapping.validationFiles.length > 0
    );
    if (operationMappings.length === 0 || !hasCodeMapping) continue;
    for (const testCase of mappedCases.get(operation.operationId) ?? []) {
      add(operation, categoryForScenarioType(testCase.scenarioType), testCase, "scenario", testCase.expectedResult);
    }
    if (Object.keys(operation.responseSchemas).length > 0 || Object.values(operation.responseHeaders).some((headers) => headers.length > 0)) {
      const responseContract = [
        ...Object.values(operation.responseSchemas).map((schema) => schema.name),
        ...Object.entries(operation.responseHeaders).flatMap(([status, headers]) => headers.map((header) => `${status}:${header}`))
      ];
      add(operation, "contract-validation", undefined, "contract", `Response matches documented schemas/headers: ${responseContract.join(", ")}.`);
    }
    if (Object.keys(operation.responseSchemas).length > 0) {
      add(operation, "schema-validation", undefined, "schema", "Response body conforms to the documented response schema.");
    }
    if (operation.requestSchema) add(operation, "request-validation", undefined, "request", `Request body conforms to ${operation.requestSchema.name}.`);
    if (operation.authentication !== "none") add(operation, "authentication", undefined, "auth", `Request is authenticated using ${operation.authentication}.`);
    if (operation.securityScopes.length > 0) add(operation, "authorization", undefined, "authorization", `Access is limited to required scopes: ${operation.securityScopes.join(", ")}.`);
    for (const error of operation.errorResponses) {
      add(operation, "error-handling", undefined, `error-${error.status}`, `Returns documented ${error.status} error response: ${error.description}.`);
    }
    if (operation.queryParameters.some((parameter) => Object.keys(parameter.constraints).length > 0) || operation.pathParameters.length > 0) {
      add(operation, "boundary", undefined, "boundary", "Boundary values are handled according to the documented parameter constraints.");
    }
  }
  return output;
}

function coverageForApiOperations(
  operations: ApiContractOperation[],
  testCases: ApiXrayTestCase[],
  requirementMappings: ApiRequirementMapping[],
  codeMappings: ApiCodeMapping[],
  risks: ApiIntelligenceReport["risks"]
): { rows: ApiCoverageRow[]; summary: ApiIntelligenceReport["coverage"] } {
  const rows = operations.map((operation): ApiCoverageRow => {
    const tests = testCases.filter((testCase) => testCase.operationId === operation.operationId);
    const categories = new Set(tests.map((testCase) => testCase.category));
    const mappedRequirements = requirementMappings.filter((mapping) => mapping.operationId === operation.operationId);
    const mapped = mappedRequirements.length > 0;
    const codeMapping = codeMappings.find((mapping) => mapping.operationId === operation.operationId);
    const codeMapped = Boolean(codeMapping && codeMapping.controllerFiles.length + codeMapping.serviceFiles.length + codeMapping.businessLogicFiles.length + codeMapping.validationFiles.length > 0);
    const errorHandlingApplicable = operation.errorResponses.length > 0;
    const securityApplicable = operation.authentication !== "none" || operation.securityScopes.length > 0;
    return {
      operationId: operation.operationId,
      method: operation.method,
      path: operation.path,
      requirementIds: [...new Set(mappedRequirements.flatMap((mapping) => mapping.requirementIds))],
      codeMapped,
      testCaseIds: [...new Set(tests.flatMap((testCase) => testCase.testCaseId ? [testCase.testCaseId] : []))],
      automationIds: [],
      risk: risks.find((risk) => risk.operationId === operation.operationId)?.level ?? "low",
      dimensions: {
        endpoint: mapped && codeMapped && tests.length > 0,
        method: mapped && tests.some((testCase) => testCase.action.startsWith(`${operation.method} `)),
        request: operation.requestSchema || operation.queryParameters.length > 0 || operation.pathParameters.length > 0
          ? categories.has("request-validation") || categories.has("boundary") || categories.has("positive") : null,
        response: Object.keys(operation.responseSchemas).length > 0 || Object.values(operation.responseHeaders).some((headers) => headers.length > 0)
          ? categories.has("contract-validation") || categories.has("schema-validation") || categories.has("positive") : null,
        validation: operation.requestSchema || operation.queryParameters.length > 0 || operation.pathParameters.length > 0
          ? categories.has("request-validation") || categories.has("boundary") : null,
        errorHandling: errorHandlingApplicable ? categories.has("error-handling") : null,
        security: securityApplicable ? categories.has("authentication") && (operation.securityScopes.length === 0 || categories.has("authorization")) : null
      }
    };
  });
  const summarize = (selector: (row: ApiCoverageRow) => boolean | null): ApiCoverageDimension => {
    const applicable = rows.filter((row) => selector(row) !== null);
    const covered = applicable.filter((row) => selector(row) === true).length;
    return { total: rows.length, covered, notApplicable: rows.length - applicable.length, coveragePercent: applicable.length === 0 ? 0 : Math.round((covered / applicable.length) * 100) };
  };
  const riskRows = rows.filter((row) => row.risk === "critical" || row.risk === "high");
  const criticalRows = rows.filter((row) => row.risk === "critical");
  return {
    rows,
    summary: {
      endpoints: summarize((row) => row.dimensions.endpoint),
      methods: summarize((row) => row.dimensions.method),
      requests: summarize((row) => row.dimensions.request),
      responses: summarize((row) => row.dimensions.response),
      validations: summarize((row) => row.dimensions.validation),
      errors: summarize((row) => row.dimensions.errorHandling),
      security: summarize((row) => row.dimensions.security),
      criticalApis: {
        total: criticalRows.length,
        covered: criticalRows.filter((row) => Object.values(row.dimensions).every((value) => value !== false)).length,
        notApplicable: 0,
        coveragePercent: criticalRows.length === 0 ? 0 : Math.round((criticalRows.filter((row) => Object.values(row.dimensions).every((value) => value !== false)).length / criticalRows.length) * 100)
      },
      highRiskEndpoints: {
        total: riskRows.length,
        covered: riskRows.filter((row) => Object.values(row.dimensions).every((value) => value !== false)).length,
        notApplicable: 0,
        coveragePercent: riskRows.length === 0 ? 0 : Math.round((riskRows.filter((row) => Object.values(row.dimensions).every((value) => value !== false)).length / riskRows.length) * 100)
      }
    }
  };
}

function coverageFailures(policy: ApiGovernancePolicy, coverage: ApiIntelligenceReport["coverage"], contractCoveragePercent: number): { failures: string[]; notApplicable: string[] } {
  const failures: string[] = [];
  const notApplicable: string[] = [];
  if (coverage.criticalApis.total === 0) notApplicable.push("Critical API coverage: no critical APIs are in scope.");
  else if (coverage.criticalApis.coveragePercent < policy.minCriticalApiCoveragePercent) failures.push(`Critical API coverage ${coverage.criticalApis.coveragePercent}% is below ${policy.minCriticalApiCoveragePercent}%.`);
  if (coverage.security.notApplicable === coverage.security.total) notApplicable.push("Authentication coverage: no authenticated APIs are in scope.");
  else if (coverage.security.coveragePercent < policy.minAuthenticationCoveragePercent) failures.push(`Authentication/security coverage ${coverage.security.coveragePercent}% is below ${policy.minAuthenticationCoveragePercent}%.`);
  if (coverage.highRiskEndpoints.total === 0) notApplicable.push("High-risk endpoint coverage: no high-risk APIs are in scope.");
  else if (coverage.highRiskEndpoints.coveragePercent < policy.minHighRiskEndpointCoveragePercent) failures.push(`High-risk endpoint coverage ${coverage.highRiskEndpoints.coveragePercent}% is below ${policy.minHighRiskEndpointCoveragePercent}%.`);
  if (contractCoveragePercent < policy.minContractCoveragePercent) failures.push(`API contract coverage ${contractCoveragePercent}% is below ${policy.minContractCoveragePercent}%.`);
  return { failures, notApplicable };
}

export function analyzeApiIntelligence(input: ApiIntelligenceInput): ApiIntelligenceReport {
  const requirements = requirementRecords(input.requirementAnalysis);
  const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const operationIds = new Set(input.discovery.operations.map((operation) => operation.operationId));
  const requirementMappings = input.requirementMappings.filter((mapping) => operationIds.has(mapping.operationId));
  const codeMappings = input.codeMappings.filter((mapping) => operationIds.has(mapping.operationId));
  const operationIdsWithRequirements = new Set(requirementMappings.map((mapping) => mapping.operationId));
  const requirementToApi = requirements.map((requirement) => {
    const mappings = requirementMappings.filter((mapping) => mapping.requirementIds.includes(requirement.id));
    return {
      requirementId: requirement.id,
      acceptanceCriteriaIds: requirement.acceptanceCriteriaIds,
      operationIds: [...new Set(mappings.map((mapping) => mapping.operationId))],
      covered: mappings.length > 0 && requirement.acceptanceCriteriaIds.every((criterionId) => mappings.some((mapping) => mapping.acceptanceCriteriaIds.includes(criterionId)))
    };
  });
  const apiToCode = input.discovery.operations.map((operation) => {
    const mapping = codeMappings.find((candidate) => candidate.operationId === operation.operationId);
    return {
      operationId: operation.operationId,
      repository: mapping?.repository ?? "",
      branch: mapping?.branch ?? "",
      commit: mapping?.commit ?? "",
      ...(mapping?.pullRequest ? { pullRequest: mapping.pullRequest } : {}),
      controllerFiles: mapping?.controllerFiles ?? [],
      serviceFiles: mapping?.serviceFiles ?? [],
      businessLogicFiles: mapping?.businessLogicFiles ?? [],
      validationFiles: mapping?.validationFiles ?? [],
      mapped: Boolean(mapping && mapping.controllerFiles.length + mapping.serviceFiles.length + mapping.businessLogicFiles.length + mapping.validationFiles.length > 0)
    };
  });
  const risks = input.discovery.operations.map((operation) => ({
    operationId: operation.operationId,
    ...apiRisk(
      operation,
      requirementMappings.filter((mapping) => mapping.operationId === operation.operationId).flatMap((mapping) => mapping.requirementIds),
      codeMappings.find((mapping) => mapping.operationId === operation.operationId),
      requirementById
    )
  }));
  const xrayTestCases = generateApiXrayCases(input.storyKey, input.discovery.operations, requirementMappings, codeMappings, input.generatedTestCases);
  const { rows: coverageRows, summary: coverage } = coverageForApiOperations(input.discovery.operations, xrayTestCases, requirementMappings, codeMappings, risks);
  for (let index = 0; index < coverageRows.length; index += 1) {
    const row = coverageRows[index];
    if (!row) continue;
    row.automationIds = input.automationReferences.filter((reference) => reference.operationId === row.operationId).map((reference) => reference.automationId);
  }
  const requirementToApiGaps = requirementToApi.filter((mapping) => !mapping.covered).map((mapping) => mapping.requirementId);
  const apisWithoutRequirements = input.discovery.operations.filter((operation) => !operationIdsWithRequirements.has(operation.operationId)).map((operation) => operation.operationId);
  const coveragePercent = (covered: number, total: number): number => total === 0 ? 0 : Math.round((covered / total) * 100);
  const endpointCoverage = coverage.endpoints.coveragePercent;
  const authenticationCoverage = coverage.security.coveragePercent;
  const highRiskCoverage = coverage.highRiskEndpoints.coveragePercent;
  const completeContractCount = input.discovery.operations.filter((operation) =>
    operation.expectedStatuses.length > 0 && operation.expectedStatuses.some((status) => status === 204 || Boolean(operation.responseSchemas[status]) || Boolean(operation.responseHeaders[status]?.length))
  ).length;
  const contractCoveragePercent = coveragePercent(completeContractCount, input.discovery.operations.length);
  const riskCoveragePercent = highRiskCoverage;
  const governancePolicy = { ...defaultApiGovernancePolicy, ...input.governancePolicy };
  const governanceResult = coverageFailures(governancePolicy, coverage, contractCoveragePercent);
  const gaps: ApiIntelligenceReport["gaps"] = [];
  const governanceFailures = [...governanceResult.failures];
  if (input.discovery.errors.length > 0) governanceFailures.push("API discovery contains unresolved source errors.");
  if (input.discovery.duplicateOperationIds.length > 0) governanceFailures.push("API discovery contains duplicate operation IDs or method/path signatures.");
  for (const error of input.discovery.errors) gaps.push({ id: `API-GAP-DISCOVERY-${gaps.length + 1}`, type: "api-discovery-error", operationId: "", description: error, recommendation: "Resolve the portal/contract discovery issue and rerun API Intelligence.", priority: "high" });
  for (const operationId of input.discovery.duplicateOperationIds) gaps.push({ id: `API-GAP-DUPLICATE-${operationId}`, type: "duplicate-api-operation", operationId, description: `Duplicate API operation or method/path signature found for ${operationId}.`, recommendation: "Resolve the duplicate contract source or consolidate the operation before generating automation.", priority: "medium" });
  for (const requirementId of requirementToApiGaps) gaps.push({ id: `API-GAP-REQ-${requirementId}`, type: "requirement-without-api", operationId: "", description: `Requirement ${requirementId} has no correlated API operation or one or more Acceptance Criteria remain unmapped.`, recommendation: "Review API portal discovery and map each Acceptance Criterion to a contract operation.", priority: requirementById.get(requirementId)?.priority ?? "medium" });
  for (const operationId of apisWithoutRequirements) gaps.push({ id: `API-GAP-SCOPE-${operationId}`, type: "api-without-requirement", operationId, description: `API ${operationId} is not represented by a Jira requirement.`, recommendation: "Confirm API scope with the product owner or document the missing requirement.", priority: risks.find((risk) => risk.operationId === operationId)?.level === "critical" ? "critical" : "high" });
  for (const mapping of apiToCode.filter((entry) => !entry.mapped)) gaps.push({ id: `API-GAP-CODE-${mapping.operationId}`, type: "api-without-code", operationId: mapping.operationId, description: `API ${mapping.operationId} has no controller/service/business/validation implementation mapping.`, recommendation: "Inspect the exact PR/commit diff and map the API contract operation to implementation code.", priority: risks.find((risk) => risk.operationId === mapping.operationId)?.level === "critical" ? "critical" : "high" });
  for (const row of coverageRows) {
    if (!row.dimensions.endpoint || !row.dimensions.method) gaps.push({ id: `API-GAP-ENDPOINT-${row.operationId}`, type: "endpoint-or-method-coverage", operationId: row.operationId, description: `Endpoint or method coverage is missing for ${row.method} ${row.path}.`, recommendation: "Add a positive API test using the existing endpoint and request-builder definitions.", priority: risks.find((risk) => risk.operationId === row.operationId)?.level === "critical" ? "critical" : "high" });
    if (row.risk === "high" || row.risk === "critical") {
      const failedDimensions = Object.entries(row.dimensions).filter(([, covered]) => covered === false).map(([dimension]) => dimension);
      if (failedDimensions.length) gaps.push({ id: `API-GAP-RISK-${row.operationId}`, type: "high-risk-api-coverage", operationId: row.operationId, description: `High-risk API ${row.operationId} lacks coverage for: ${failedDimensions.join(", ")}.`, recommendation: "Generate additional authentication, authorization, schema, error, and contract tests before promotion.", priority: row.risk === "critical" ? "critical" : "high" });
    }
  }
  const automationPlan: ApiAutomationPlan[] = input.discovery.operations
    .filter((operation) => operationIdsWithRequirements.has(operation.operationId))
    .map((operation) => ({
      operationId: operation.operationId,
      scriptName: `${operation.operationId}.api.spec.ts`,
      testCaseIds: xrayTestCases.filter((testCase) => testCase.operationId === operation.operationId).map((testCase) => testCase.id),
      reusableUtilities: ["api-framework/src/clients/HttpClient.ts", "api-framework/src/requests/RequestBuilder.ts", "api-framework/src/validators/response-validator.ts", "api-framework/src/reporting/ApiReport.ts"],
      testData: [operation.requestSchema?.name, ...operation.queryParameters.map((parameter) => parameter.name)].filter((item): item is string => Boolean(item)),
      environmentVariables: ["API_BASE_URL", ...(operation.authentication === "bearer" || operation.authentication === "oauth2" ? ["API_TOKEN"] : []), ...(operation.authentication === "api-key" ? ["API_KEY"] : [])],
      requestBuilder: "api-framework/src/requests/RequestBuilder.ts",
      contractReferences: [operation.operationId, ...Object.values(operation.responseSchemas).map((schema) => schema.name), ...Object.entries(operation.responseHeaders).flatMap(([status, headers]) => headers.map((header) => `${status}:${header}`)), ...(operation.requestSchema ? [operation.requestSchema.name] : [])]
    }));
  const requirementCorrelationPercent = coveragePercent(requirementToApi.filter((mapping) => mapping.covered).length, requirementToApi.length);
  const implementationCoveragePercent = coveragePercent(apiToCode.filter((mapping) => mapping.mapped).length, apiToCode.length);
  const readinessMetrics = [endpointCoverage, contractCoveragePercent, requirementCorrelationPercent, implementationCoveragePercent];
  if (coverage.security.notApplicable < coverage.security.total) readinessMetrics.push(authenticationCoverage);
  if (coverage.highRiskEndpoints.total > 0) readinessMetrics.push(highRiskCoverage);
  const readinessScore = Math.round(readinessMetrics.reduce((sum, metric) => sum + metric, 0) / readinessMetrics.length);
  const testManagementTool = input.testManagementTool ?? "";

  return {
    schemaVersion: "1.0.0",
    storyKey: input.storyKey,
    discovery: {
      portals: input.discovery.portals,
      duplicateOperationIds: input.discovery.duplicateOperationIds,
      errors: input.discovery.errors
    },
    discoveredOperations: input.discovery.operations,
    requirementToApi,
    apiToCode,
    risks,
    xrayTestCases,
    automationPlan,
    coverageRows,
    coverage,
    gaps,
    governance: { ready: governanceFailures.length === 0, policy: governancePolicy, notApplicable: governanceResult.notApplicable, failures: governanceFailures },
    executiveMetrics: {
      apiCoveragePercent: endpointCoverage,
      contractCoveragePercent,
      requirementCorrelationPercent,
      implementationCoveragePercent,
      riskCoveragePercent,
      generatedXrayTestCount: input.xrayEnabled && testManagementTool.toUpperCase() === "XRAY" ? xrayTestCases.length : 0,
      plannedScriptCount: automationPlan.length,
      readinessScore
    }
  };
}

export async function writeApiIntelligenceArtifact(report: ApiIntelligenceReport, outputDirectory: string): Promise<void> {
  await writeApiIntelligenceReport(report, outputDirectory);
}
