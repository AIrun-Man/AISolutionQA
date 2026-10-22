import type { RequirementAnalysis } from "../models/requirements.js";
import type { JiraTestRepositorySection, StandardTestCase } from "../models/test-cases.js";
import type { JiraGenerationPaths, JiraTestManagementTool } from "../storage/generation.js";
import type { AutomationStrategyDecision } from "../workflow/engine.js";

export interface JiraTestSectionDestination {
  section: JiraTestRepositorySection;
  boardUrl?: string;
  projectKey: string;
  repositoryPath?: string;
  testManagementTool?: JiraTestManagementTool;
  ready: boolean;
  blockers: string[];
  testCases: StandardTestCase[];
}

export interface JiraTestCaseRoutingPlan {
  destinations: Record<JiraTestRepositorySection, JiraTestSectionDestination>;
  testCases: StandardTestCase[];
  unroutedTestCaseIds: string[];
}

function requirementAcceptanceCriteria(analysis: RequirementAnalysis): Map<string, Set<string>> {
  const mappings = new Map<string, Set<string>>();
  const requirementGroups = [
    analysis.functionalRequirements ?? [],
    analysis.nonFunctionalRequirements ?? [],
    analysis.businessRules ?? [],
    analysis.validationRules ?? [],
    analysis.implicitRequirements ?? [],
    analysis.risks ?? []
  ];
  for (const requirement of requirementGroups.flat()) {
    mappings.set(requirement.id, new Set(requirement.acceptanceCriteriaIds));
  }
  return mappings;
}

function sectionsForStrategy(decision: AutomationStrategyDecision): JiraTestRepositorySection[] {
  if (decision.strategy === "ui-test") return ["UI"];
  if (decision.strategy === "api-test" || decision.strategy === "contract-test") return ["API"];
  if (decision.strategy === "performance-test") return ["Performance"];
  return decision.implementationSurfaces.flatMap((surface) => {
    if (surface === "ui") return ["UI"];
    if (surface === "api" || surface === "contract") return ["API"];
    if (surface === "performance") return ["Performance"];
    return [];
  });
}

export function createJiraTestCaseRoutingPlan(
  analysis: RequirementAnalysis,
  testCases: StandardTestCase[],
  decisions: AutomationStrategyDecision[],
  paths: JiraGenerationPaths
): JiraTestCaseRoutingPlan {
  const criterionIdsByRequirement = requirementAcceptanceCriteria(analysis);
  const testCasesBySection: Record<JiraTestRepositorySection, StandardTestCase[]> = {
    UI: [],
    API: [],
    Performance: []
  };
  const sectionsByTestCase = new Map<string, Set<JiraTestRepositorySection>>();
  const unroutedTestCaseIds: string[] = [];

  for (const testCase of testCases) {
    const caseCriteria = new Set(testCase.traceability.acceptanceCriteriaIds);
    const matchingDecisions = decisions.filter((decision) => decision.requirementIds.some((requirementId) =>
      [...(criterionIdsByRequirement.get(requirementId) ?? [])].some((criterionId) => caseCriteria.has(criterionId))
    ));
    const sections = new Set(matchingDecisions.flatMap(sectionsForStrategy));
    if (sections.size === 0) {
      unroutedTestCaseIds.push(testCase.id);
      continue;
    }
    const repositorySections = [...sections];
    sectionsByTestCase.set(testCase.id, sections);
    for (const section of repositorySections) {
      testCasesBySection[section].push({ ...testCase, repositorySections });
    }
  }

  const createDestination = (section: JiraTestRepositorySection): JiraTestSectionDestination => {
    const blockers: string[] = [];
    if (!paths.jiraBoardUrl) blockers.push("Jira test repository board URL is not configured.");
    if (!paths.jiraProjectKey) blockers.push("Jira project key is not configured.");
    if (!paths.testRepositoryPaths[section]) blockers.push(`Test repository path for ${section} is not configured.`);
    if (!paths.testManagementTool) blockers.push("Jira test management tool is not configured.");
    return {
      section,
      ...(paths.jiraBoardUrl ? { boardUrl: paths.jiraBoardUrl } : {}),
      projectKey: paths.jiraProjectKey,
      ...(paths.testRepositoryPaths[section] ? { repositoryPath: paths.testRepositoryPaths[section] } : {}),
      ...(paths.testManagementTool ? { testManagementTool: paths.testManagementTool } : {}),
      ready: blockers.length === 0,
      blockers,
      testCases: testCasesBySection[section]
    };
  };

  return {
    destinations: {
      UI: createDestination("UI"),
      API: createDestination("API"),
      Performance: createDestination("Performance")
    },
    testCases: testCases.map((testCase) => {
      const repositorySections = sectionsByTestCase.get(testCase.id);
      return repositorySections
        ? { ...testCase, repositorySections: [...repositorySections] }
        : testCase;
    }),
    unroutedTestCaseIds
  };
}
