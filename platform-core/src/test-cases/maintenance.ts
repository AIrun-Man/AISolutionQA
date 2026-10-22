import { assessLocator, type LocatorCandidate } from "../governance/locator.js";

export type MaintenanceIssueType = "flaky-test" | "unused-test" | "duplicate-test" | "weak-locator" | "repeated-failure";
export type HistoricalTestStatus = "passed" | "failed" | "skipped" | "blocked" | "incomplete";

export interface MaintainedTest {
  id: string;
  title: string;
  steps: string[];
  locators: LocatorCandidate[];
}

export interface HistoricalTestExecution {
  testId: string;
  status: HistoricalTestStatus;
  executedAt: string;
}

export interface MaintenanceFinding {
  type: MaintenanceIssueType;
  testIds: string[];
  evidence: string[];
  recommendation: string;
}

export interface MaintenanceOptions {
  historyComplete: boolean;
  historyWindowStart?: string;
  recentExecutionLimit?: number;
  repeatedFailureThreshold?: number;
}

export function analyzeTestMaintenance(
  tests: MaintainedTest[],
  history: HistoricalTestExecution[],
  options: MaintenanceOptions
): MaintenanceFinding[] {
  const recentExecutionLimit = options.recentExecutionLimit ?? 10;
  const repeatedFailureThreshold = options.repeatedFailureThreshold ?? 3;
  if (!Number.isInteger(recentExecutionLimit) || recentExecutionLimit < 1) {
    throw new Error("Recent execution limit must be a positive integer.");
  }
  if (!Number.isInteger(repeatedFailureThreshold) || repeatedFailureThreshold < 2) {
    throw new Error("Repeated failure threshold must be at least two.");
  }

  const findings: MaintenanceFinding[] = [];
  const testsById = new Map(tests.map((test) => [test.id, test]));
  const executionsByTest = new Map<string, HistoricalTestExecution[]>();
  for (const execution of history) {
    if (!testsById.has(execution.testId)) continue;
    if (options.historyWindowStart && execution.executedAt < options.historyWindowStart) continue;
    const entries = executionsByTest.get(execution.testId) ?? [];
    entries.push(execution);
    executionsByTest.set(execution.testId, entries);
  }

  for (const test of tests) {
    const executions = (executionsByTest.get(test.id) ?? [])
      .slice()
      .sort((left, right) => Date.parse(right.executedAt) - Date.parse(left.executedAt))
      .slice(0, recentExecutionLimit);
    if (executions.length === 0) {
      if (options.historyComplete) {
        findings.push({
          type: "unused-test",
          testIds: [test.id],
          evidence: [options.historyWindowStart
            ? `No executions found since ${options.historyWindowStart}.`
            : "No executions found in the complete supplied history."],
          recommendation: "Confirm the test is still required and include it in an appropriate execution scope."
        });
      }
    }

    const statuses = new Set(executions.map((execution) => execution.status));
    if (statuses.has("passed") && statuses.has("failed")) {
      findings.push({
        type: "flaky-test",
        testIds: [test.id],
        evidence: executions.map((execution) => `${execution.executedAt}: ${execution.status}`),
        recommendation: "Review timing, shared state, test data, and environment dependencies before increasing retries."
      });
    }

    const consecutiveFailures = executions.findIndex((execution) => execution.status !== "failed");
    const failureCount = consecutiveFailures === -1 ? executions.length : consecutiveFailures;
    if (failureCount >= repeatedFailureThreshold) {
      findings.push({
        type: "repeated-failure",
        testIds: [test.id],
        evidence: executions.slice(0, failureCount).map((execution) => `${execution.executedAt}: failed`),
        recommendation: "Triage the latest failure evidence and correct the root cause before treating this test as a gate."
      });
    }

    const weakLocators = test.locators.map((locator) => ({ locator, assessment: assessLocator(locator) }))
      .filter(({ assessment }) => !assessment.approved);
    if (weakLocators.length > 0) {
      findings.push({
        type: "weak-locator",
        testIds: [test.id],
        evidence: weakLocators.map(({ locator, assessment }) =>
          `${locator.strategy}(${locator.value}): score ${assessment.score}; ${assessment.violations.join(" ")}`
        ),
        recommendation: "Prefer a governed role, label, or test-id locator and document any required exception."
      });
    }
  }

  const testsBySignature = new Map<string, string[]>();
  for (const test of tests) {
    const signature = [test.title, ...test.steps]
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!signature) continue;
    const ids = testsBySignature.get(signature) ?? [];
    ids.push(test.id);
    testsBySignature.set(signature, ids);
  }
  for (const ids of testsBySignature.values()) {
    if (ids.length > 1) {
      findings.push({
        type: "duplicate-test",
        testIds: ids.sort(),
        evidence: ["Normalized title and ordered steps are identical."],
        recommendation: "Review whether these cases can be consolidated without losing requirement traceability."
      });
    }
  }

  return findings;
}