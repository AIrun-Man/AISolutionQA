import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { CoverageReport } from "../coverage/engine.js";
import type { CoverageIntelligenceReport } from "../coverage/intelligence.js";
import type { ApiIntelligenceReport } from "../api/intelligence.js";
import type { TraceabilityValidation } from "../traceability/engine.js";

export type ExecutionStatus = "passed" | "failed" | "skipped" | "blocked" | "cancelled" | "incomplete";

export interface ExecutionResult {
  id: string;
  testId: string;
  automationId: string;
  status: ExecutionStatus;
  durationMs: number;
  error?: string;
  artifacts: string[];
}

export interface ExecutionSummary {
  executionId: string;
  revision: string;
  environment: string;
  startedAt: string;
  completedAt: string;
  status: ExecutionStatus;
  results: ExecutionResult[];
}

export interface ExecutiveSummaryInput {
  storyKey: string;
  execution: ExecutionSummary;
  coverage: CoverageReport;
  traceability: TraceabilityValidation;
  confirmedProductDefectCount: number;
  xray?: {
    testsCreated: number;
    importArtifactLocation?: string;
    automationLinks?: Array<{ xrayTestId: string; automationId: string; scriptPath: string }>;
  };
}

export interface ExecutiveSummary {
  storyKey: string;
  executionId: string;
  executionStatus: ExecutionStatus;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  blockedOrIncompleteTests: number;
  requirementCoveragePercent: number;
  coverageByDimension: CoverageReport["coverageByDimension"];
  overallRiskScore: number;
  riskLevel: CoverageReport["riskLevel"];
  traceabilityValid: boolean;
  traceabilityIssues: string[];
  confirmedProductDefectCount: number;
  xrayTestsCreated: number;
  xrayImportArtifactLocation?: string;
  xrayAutomationLinks: Array<{ xrayTestId: string; automationId: string; scriptPath: string }>;
  summary: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/(authorization)\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(api[-_ ]?key|token|password|cookie)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function sanitizeArtifactValue(value: unknown): unknown {
  if (typeof value === "string") return redactSensitiveText(value);
  if (Array.isArray(value)) return value.map(sanitizeArtifactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /authorization|api[-_ ]?key|token|password|cookie|secret/i.test(key)
        ? "[REDACTED]"
        : sanitizeArtifactValue(item)
    ]));
  }
  return value;
}

export async function writeJsonArtifact(value: unknown, outputDirectory: string, fileName: string): Promise<void> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(fileName) || basename(fileName) !== fileName) {
    throw new Error("Artifact file name must be a simple JSON file name.");
  }
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, fileName), JSON.stringify(sanitizeArtifactValue(value), null, 2), "utf8");
}

export async function writeExecutionReport(summary: ExecutionSummary, outputDirectory: string): Promise<void> {
  const sanitized: ExecutionSummary = {
    ...summary,
    results: summary.results.map((result) => ({
      ...result,
      error: result.error ? redactSensitiveText(result.error) : undefined
    }))
  };
  const rows = sanitized.results
    .map(
      (result) =>
        `<tr><td>${escapeHtml(result.testId)}</td><td>${escapeHtml(result.automationId)}</td><td>${escapeHtml(result.status)}</td><td>${result.durationMs}</td><td>${escapeHtml(result.error ?? "")}</td></tr>`
    )
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Execution ${escapeHtml(sanitized.executionId)}</title><style>body{font-family:system-ui;margin:2rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.5rem;text-align:left}</style></head><body><h1>Execution ${escapeHtml(sanitized.executionId)}</h1><p>Status: <strong>${escapeHtml(sanitized.status)}</strong></p><p>Revision: ${escapeHtml(sanitized.revision)} | Environment: ${escapeHtml(sanitized.environment)}</p><table><thead><tr><th>Test</th><th>Automation</th><th>Status</th><th>Duration (ms)</th><th>Error</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "execution-summary.json"), JSON.stringify(sanitized, null, 2), "utf8");
  await writeFile(join(outputDirectory, "index.html"), html, "utf8");
  await writeFile(join(outputDirectory, "artifact-manifest.json"), JSON.stringify({
    executionId: sanitized.executionId,
    generatedAt: new Date().toISOString(),
    artifacts: ["execution-summary.json", "index.html"]
  }, null, 2), "utf8");
}

export function createExecutiveSummary(input: ExecutiveSummaryInput): ExecutiveSummary {
  const passedTests = input.execution.results.filter((result) => result.status === "passed").length;
  const failedTests = input.execution.results.filter((result) => result.status === "failed").length;
  const blockedOrIncompleteTests = input.execution.results.filter((result) =>
    ["blocked", "incomplete", "cancelled"].includes(result.status)
  ).length;
  const traceabilityIssues = [
    ...input.traceability.orphanEntityIds.map((id) => `Orphan entity: ${id}`),
    ...input.traceability.invalidLinkIds.map((id) => `Invalid link: ${id}`),
    ...input.traceability.brokenChainIds.map((id) => `Broken chain: ${id}`)
  ];
  const traceabilityStatus = input.traceability.valid ? "valid" : "has unresolved issues";
  const xrayTestsCreated = input.xray?.testsCreated ?? 0;
  const summary = `${passedTests}/${input.execution.results.length} tests passed; requirement coverage is ${input.coverage.requirementCoveragePercent}%; overall risk is ${input.coverage.riskLevel}; traceability ${traceabilityStatus}; ${xrayTestsCreated} Xray tests created; ${input.confirmedProductDefectCount} confirmed product defects.`;

  return {
    storyKey: input.storyKey,
    executionId: input.execution.executionId,
    executionStatus: input.execution.status,
    totalTests: input.execution.results.length,
    passedTests,
    failedTests,
    blockedOrIncompleteTests,
    requirementCoveragePercent: input.coverage.requirementCoveragePercent,
    coverageByDimension: input.coverage.coverageByDimension,
    overallRiskScore: input.coverage.overallRiskScore,
    riskLevel: input.coverage.riskLevel,
    traceabilityValid: input.traceability.valid,
    traceabilityIssues,
    confirmedProductDefectCount: input.confirmedProductDefectCount,
    xrayTestsCreated,
    ...(input.xray?.importArtifactLocation ? { xrayImportArtifactLocation: input.xray.importArtifactLocation } : {}),
    xrayAutomationLinks: input.xray?.automationLinks ?? [],
    summary
  };
}

export async function writeExecutiveSummary(input: ExecutiveSummaryInput, outputDirectory: string): Promise<void> {
  const summary = createExecutiveSummary(input);
  const xrayLinks = summary.xrayAutomationLinks.map((link) =>
    `<tr><td>${escapeHtml(link.xrayTestId)}</td><td>${escapeHtml(link.automationId)}</td><td>${escapeHtml(link.scriptPath)}</td></tr>`
  ).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Executive Summary ${escapeHtml(summary.storyKey)}</title><style>body{font-family:system-ui;margin:2rem;color:#202124}table{border-collapse:collapse;width:100%;margin:1rem 0 2rem}th,td{border:1px solid #c8cdd2;padding:.5rem;text-align:left}</style></head><body><h1>Executive Summary: ${escapeHtml(summary.storyKey)}</h1><p>${escapeHtml(summary.summary)}</p><p>Execution: ${escapeHtml(summary.executionStatus)} | Requirement Coverage: ${summary.requirementCoveragePercent}% | Xray Tests Created: ${summary.xrayTestsCreated}</p><p>Xray Import Artifact: ${escapeHtml(summary.xrayImportArtifactLocation ?? "Not provided")}</p><table><thead><tr><th>Xray Test</th><th>Automation ID</th><th>Script</th></tr></thead><tbody>${xrayLinks}</tbody></table></body></html>`;
  await writeJsonArtifact(summary, outputDirectory, "executive-summary.json");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "executive-summary.html"), html, "utf8");
}

export async function writeCoverageIntelligenceReport(report: CoverageIntelligenceReport, outputDirectory: string): Promise<void> {
  const requirementRows = report.requirementCoverageMatrix.map((row) =>
    `<tr><td>${escapeHtml(row.requirementId)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.acceptanceCriteriaIds.join(", "))}</td><td>${escapeHtml(row.codePathIds.join(", "))}</td><td>${escapeHtml(row.testCaseIds.join(", "))}</td><td>${escapeHtml(row.automationIds.join(", "))}</td></tr>`
  ).join("");
  const codeRows = report.codeCoverageMapping.map((row) =>
    `<tr><td>${escapeHtml(row.filePath)}</td><td>${escapeHtml(row.functionName)}</td><td>${escapeHtml(row.apiName ?? "")}</td><td>${escapeHtml([row.repository, row.branch, row.pullRequest, row.commit].filter(Boolean).join(" | "))}</td><td>${escapeHtml(row.testCaseIds.join(", "))}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.priority)}</td></tr>`
  ).join("");
  const metricRows = Object.entries(report.metrics).map(([metric, value]) =>
    `<tr><th>${escapeHtml(metric)}</th><td>${value}</td></tr>`
  ).join("");
  const gapRows = report.gaps.findings.map((gap) =>
    `<tr><td>${escapeHtml(gap.type)}</td><td>${escapeHtml(gap.entityId)}</td><td>${escapeHtml(gap.priority)}</td><td>${escapeHtml(gap.recommendation)}</td></tr>`
  ).join("");
  const riskRows = report.risks.map((risk) =>
    `<tr><td>${escapeHtml(risk.entityType)}</td><td>${escapeHtml(risk.entityId)}</td><td>${escapeHtml(risk.priority)}</td><td>${risk.uncovered ? "Uncovered" : "Covered"}</td><td>${escapeHtml(risk.recommendation)}</td></tr>`
  ).join("");
  const trendRows = report.trends.map((trend) =>
    `<tr><td>${escapeHtml(trend.metric)}</td><td>${trend.previousPercent}%</td><td>${trend.currentPercent}%</td><td>${trend.changePercentagePoints} pp</td></tr>`
  ).join("");
  const governanceFailures = report.governance.failures.map((failure) => `<li>${escapeHtml(failure)}</li>`).join("");
  const governanceNotApplicable = report.governance.notApplicable.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Coverage Intelligence ${escapeHtml(report.storyKey)}</title><style>body{font-family:system-ui;margin:2rem;color:#202124}table{border-collapse:collapse;width:100%;margin:1rem 0 2rem}th,td{border:1px solid #c8cdd2;padding:.5rem;text-align:left}h2{margin-top:2rem}.status{font-weight:600}.blocked{color:#b42318}.ready{color:#067647}</style></head><body><h1>Coverage Intelligence: ${escapeHtml(report.storyKey)}</h1><p class="status ${report.governance.ready ? "ready" : "blocked"}">Governance: ${report.governance.ready ? "Ready" : "Blocked"} | Readiness: ${report.metrics.readinessScore}% | Story Coverage: ${report.executiveDashboard.storyCoverageScore}% | Risks: ${report.executiveDashboard.coverageRisks} | Gaps: ${report.executiveDashboard.coverageGaps}</p><h2>Coverage Metrics</h2><table><tbody>${metricRows}</tbody></table><h2>Governance</h2><h3>Failed thresholds</h3><ul>${governanceFailures || "<li>All configured coverage gates passed.</li>"}</ul><h3>Not applicable</h3><ul>${governanceNotApplicable || "<li>All governance checks had applicable scope.</li>"}</ul><h2>Requirement Coverage Matrix</h2><table><thead><tr><th>Requirement</th><th>Status</th><th>Acceptance Criteria</th><th>Code Paths</th><th>Test Cases</th><th>Automation</th></tr></thead><tbody>${requirementRows}</tbody></table><h2>Code Coverage Mapping</h2><table><thead><tr><th>File</th><th>Function</th><th>API</th><th>Repository/Branch/PR/Commit</th><th>Test Cases</th><th>Status</th><th>Priority</th></tr></thead><tbody>${codeRows}</tbody></table><h2>Coverage Gaps</h2><table><thead><tr><th>Type</th><th>Entity</th><th>Priority</th><th>Recommendation</th></tr></thead><tbody>${gapRows}</tbody></table><h2>Coverage Risks</h2><table><thead><tr><th>Area</th><th>Entity</th><th>Priority</th><th>Status</th><th>Recommendation</th></tr></thead><tbody>${riskRows}</tbody></table><h2>Coverage Trends</h2><table><thead><tr><th>Metric</th><th>Previous</th><th>Current</th><th>Change</th></tr></thead><tbody>${trendRows}</tbody></table></body></html>`;
  await mkdir(outputDirectory, { recursive: true });
  await writeJsonArtifact(report, outputDirectory, "coverage-intelligence-report.json");
  await writeFile(join(outputDirectory, "coverage-dashboard.html"), html, "utf8");
}

export async function writeApiIntelligenceReport(report: ApiIntelligenceReport, outputDirectory: string): Promise<void> {
  const operationRows = report.discoveredOperations.map((operation) => {
    const coverage = report.coverageRows.find((row) => row.operationId === operation.operationId);
    const risk = report.risks.find((item) => item.operationId === operation.operationId);
    return `<tr><td>${escapeHtml(operation.operationId)}</td><td>${escapeHtml(operation.method)} ${escapeHtml(operation.path)}</td><td>${escapeHtml(operation.authentication)}</td><td>${escapeHtml(operation.expectedStatuses.join(", "))}</td><td>${escapeHtml(risk?.level ?? "low")}</td><td>${coverage?.dimensions.endpoint ? "Covered" : "Gap"}</td></tr>`;
  }).join("");
  const gapRows = report.gaps.map((gap) =>
    `<tr><td>${escapeHtml(gap.type)}</td><td>${escapeHtml(gap.operationId)}</td><td>${escapeHtml(gap.priority)}</td><td>${escapeHtml(gap.recommendation)}</td></tr>`
  ).join("");
  const metricRows = Object.entries(report.executiveMetrics).map(([metric, value]) =>
    `<tr><th>${escapeHtml(metric)}</th><td>${typeof value === "number" ? value : 0}</td></tr>`
  ).join("");
  const coverageRows = report.coverageRows.map((row) => `<tr><td>${escapeHtml(row.operationId)}</td><td>${escapeHtml(row.method)} ${escapeHtml(row.path)}</td><td>${row.dimensions.request === null ? "N/A" : row.dimensions.request ? "Covered" : "Gap"}</td><td>${row.dimensions.response === null ? "N/A" : row.dimensions.response ? "Covered" : "Gap"}</td><td>${row.dimensions.validation === null ? "N/A" : row.dimensions.validation ? "Covered" : "Gap"}</td><td>${row.dimensions.errorHandling === null ? "N/A" : row.dimensions.errorHandling ? "Covered" : "Gap"}</td><td>${row.dimensions.security === null ? "N/A" : row.dimensions.security ? "Covered" : "Gap"}</td></tr>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>API Intelligence ${escapeHtml(report.storyKey)}</title><style>body{font-family:system-ui;margin:2rem;color:#202124}table{border-collapse:collapse;width:100%;margin:1rem 0 2rem}th,td{border:1px solid #c8cdd2;padding:.5rem;text-align:left}h2{margin-top:2rem}.blocked{color:#b42318}.ready{color:#067647}</style></head><body><h1>API Intelligence: ${escapeHtml(report.storyKey)}</h1><p class="${report.governance.ready ? "ready" : "blocked"}">API governance: ${report.governance.ready ? "Ready" : "Blocked"}</p><h2>Executive Metrics</h2><table><tbody>${metricRows}</tbody></table><h2>Discovered API Operations</h2><table><thead><tr><th>Operation</th><th>Endpoint</th><th>Authentication</th><th>Statuses</th><th>Risk</th><th>Endpoint Coverage</th></tr></thead><tbody>${operationRows}</tbody></table><h2>API Coverage</h2><table><thead><tr><th>Operation</th><th>Endpoint</th><th>Request</th><th>Response</th><th>Validation</th><th>Errors</th><th>Security</th></tr></thead><tbody>${coverageRows}</tbody></table><h2>Gaps and Recommendations</h2><table><thead><tr><th>Gap</th><th>Operation</th><th>Priority</th><th>Recommendation</th></tr></thead><tbody>${gapRows}</tbody></table></body></html>`;
  await mkdir(outputDirectory, { recursive: true });
  await writeJsonArtifact(report, outputDirectory, "api-intelligence-report.json");
  await writeFile(join(outputDirectory, "api-intelligence-dashboard.html"), html, "utf8");
}

export async function ensureReportParent(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}
