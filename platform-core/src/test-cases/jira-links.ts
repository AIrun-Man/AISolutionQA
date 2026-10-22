import type { JiraTestManagementTool } from "../storage/generation.js";
import type { JiraTestRepositorySection } from "../models/test-cases.js";

export interface JiraTestCaseIssueLink {
  storyKey: string;
  testCaseId: string;
  issueKey: string;
  issueUrl: string;
  boardUrl: string;
  projectKey: string;
  repositoryPath: string;
  sections: JiraTestRepositorySection[];
  testManagementTool: JiraTestManagementTool;
}

export function validateJiraTestCaseIssueLinks(links: JiraTestCaseIssueLink[]): string[] {
  const errors: string[] = [];
  const testCaseIds = new Set<string>();
  const issueKeys = new Set<string>();

  for (const link of links) {
    const stableTestCaseKey = `${link.storyKey}:${link.testCaseId}`;
    if (!/^[A-Z][A-Z0-9]+-[1-9][0-9]*$/.test(link.storyKey)) errors.push(`Invalid Jira source Story key: ${link.storyKey}.`);
    if (!/^TC-[1-9][0-9]*$/.test(link.testCaseId)) errors.push(`Invalid generated test-case ID: ${link.testCaseId}.`);
    if (testCaseIds.has(stableTestCaseKey)) errors.push(`Duplicate Jira link for test case ${stableTestCaseKey}.`);
    testCaseIds.add(stableTestCaseKey);
    if (!link.issueKey.trim()) errors.push(`Jira issue key is required for ${stableTestCaseKey}.`);
    if (issueKeys.has(link.issueKey)) errors.push(`Jira issue ${link.issueKey} is linked to multiple generated test cases.`);
    issueKeys.add(link.issueKey);
    for (const [label, value] of [
      ["issue URL", link.issueUrl],
      ["board URL", link.boardUrl],
      ["project key", link.projectKey],
      ["repository path", link.repositoryPath]
    ] as const) {
      if (!value.trim()) errors.push(`${label} is required for ${stableTestCaseKey}.`);
    }
    for (const value of [link.issueUrl, link.boardUrl]) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) errors.push(`Jira URL must use HTTP or HTTPS: ${value}.`);
      } catch {
        errors.push(`Invalid Jira URL: ${value}.`);
      }
    }
    if (link.sections.length === 0 || new Set(link.sections).size !== link.sections.length) {
      errors.push(`Jira repository sections must be non-empty and unique for ${stableTestCaseKey}.`);
    }
    if (link.sections.some((section) => !["UI", "API", "Performance"].includes(section))) {
      errors.push(`Unsupported Jira repository section for ${stableTestCaseKey}.`);
    }
  }

  return errors;
}
