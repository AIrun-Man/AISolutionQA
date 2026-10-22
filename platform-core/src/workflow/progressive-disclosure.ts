import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import type { RepositoryContextModel } from "../implementation/lineage.js";

export type SupportedQualityIntent =
  | "analyze_story"
  | "analyze_branch"
  | "generate_test_cases"
  | "generate_xray_tests"
  | "generate_ui_automation"
  | "generate_api_automation"
  | "generate_performance_tests"
  | "run_pipeline"
  | "generate_report"
  | "analyze_coverage"
  | "analyze_defects";

export type ProgressiveDisclosureSkill =
  | "jira-intelligence"
  | "github-intelligence"
  | "adr-intelligence"
  | "api-intelligence"
  | "playwright-intelligence"
  | "xray-intelligence"
  | "coverage-intelligence"
  | "governance"
  | "reporting"
  | "performance-intelligence"
  | "test-data-intelligence"
  | "merge-traceability-intelligence"
  | "commit-reconstruction-intelligence"
  | "implementation-intelligence"
  | "existing-test-intelligence";

export type MemoryKnowledgeCategory =
  | "historical-stories"
  | "historical-coverage"
  | "existing-xray-tests"
  | "existing-automation"
  | "defect-history"
  | "reusable-patterns"
  | "historical-prs"
  | "merge-commit-references"
  | "commit-lineage"
  | "story-to-commit-relationships";

export type ProgressiveDisclosurePromptContract =
  | "requirement-analysis.md"
  | "requirement-governance.md"
  | "test-generation-governance.md"
  | "script-governance.md"
  | "performance-governance.md"
  | "data-privacy-governance.md"
  | "enterprise-quality-gate.md"
  | "jira-story-processing.md"
  | "scenario-generation.md"
  | "code-analysis.md"
  | "requirement-code-validation.md"
  | "automation-strategy-selection.md"
  | "source-impact-analysis.md"
  | "application-exploration.md"
  | "xray-repository-intelligence.md"
  | "test-reuse-intelligence.md"
  | "test-data-intelligence.md"
  | "test-case-generation.md"
  | "xray-import.md"
  | "ui-automation-generation.md"
  | "api-automation-generation.md"
  | "api-intelligence.md"
  | "coverage-validation.md"
  | "coverage-intelligence.md"
  | "automation-repository-discovery.md"
  | "framework-intelligence.md"
  | "repository-standards-intelligence.md"
  | "pipeline-intelligence.md"
  | "existing-test-discovery.md"
  | "existing-automation-intelligence.md"
  | "coverage-discovery.md"
  | "regression-impact-intelligence.md"
  | "coverage-delta-intelligence.md"
  | "reuse-first-generation.md"
  | "smart-regression-suite-builder.md"
  | "reuse-governance.md"
  | "failure-analysis.md"
  | "workflow-orchestration.md";

export interface ProgressiveDisclosureInput {
  intent: SupportedQualityIntent | "unclassified";
  repositoryContext?: Partial<RepositoryContextModel>;
  requestedCapabilities?: readonly ProgressiveDisclosureSkill[];
  requestedPromptContracts?: readonly ProgressiveDisclosurePromptContract[];
}

export interface ProgressiveDisclosureRoute {
  intent: SupportedQualityIntent | "unclassified";
  primaryAgent: string | "no_catalog_match";
  supportingAgents: string[];
  catalogsConsulted: ["intent.md", "context.md", "agents.md", "memory.md", "skills/"];
  memoryCategories: MemoryKnowledgeCategory[];
  selectedSkills: ProgressiveDisclosureSkill[];
  selectedPromptContracts: ProgressiveDisclosurePromptContract[];
  branchResolution: "not-required" | "direct-branch" | "reconstruction" | "pending";
  fallback: "existing-prompt-library" | null;
}

export interface LoadedProgressiveDisclosureSkills {
  loaded: Array<{ name: ProgressiveDisclosureSkill; content: string }>;
  unavailable: ProgressiveDisclosureSkill[];
  fallback: "existing-prompt-library" | null;
}

export interface LoadedProgressiveDisclosurePrompts {
  loaded: Array<{ name: ProgressiveDisclosurePromptContract; content: string }>;
  unavailable: ProgressiveDisclosurePromptContract[];
  fallback: "existing-prompt-library" | null;
}

const skillSelection: Record<SupportedQualityIntent, ProgressiveDisclosureSkill[]> = {
  analyze_story: ["jira-intelligence"],
  analyze_branch: ["github-intelligence"],
  generate_test_cases: ["jira-intelligence", "xray-intelligence", "coverage-intelligence", "existing-test-intelligence"],
  generate_xray_tests: ["jira-intelligence", "xray-intelligence", "coverage-intelligence", "existing-test-intelligence"],
  generate_ui_automation: ["jira-intelligence", "github-intelligence", "playwright-intelligence", "xray-intelligence", "coverage-intelligence", "existing-test-intelligence"],
  generate_api_automation: ["jira-intelligence", "github-intelligence", "api-intelligence", "xray-intelligence", "coverage-intelligence", "existing-test-intelligence"],
  generate_performance_tests: ["jira-intelligence", "performance-intelligence", "xray-intelligence", "coverage-intelligence", "existing-test-intelligence"],
  run_pipeline: ["existing-test-intelligence", "xray-intelligence"],
  generate_report: ["reporting"],
  analyze_coverage: ["coverage-intelligence", "xray-intelligence", "existing-test-intelligence"],
  analyze_defects: ["jira-intelligence"]
};

const promptsByIntent: Record<SupportedQualityIntent, ProgressiveDisclosurePromptContract[]> = {
  analyze_story: ["jira-story-processing.md", "requirement-governance.md", "requirement-analysis.md"],
  analyze_branch: ["code-analysis.md", "source-impact-analysis.md", "requirement-code-validation.md"],
  generate_test_cases: ["scenario-generation.md", "test-case-generation.md", "test-generation-governance.md", "existing-test-discovery.md", "coverage-discovery.md", "coverage-delta-intelligence.md", "reuse-first-generation.md", "reuse-governance.md"],
  generate_xray_tests: ["xray-repository-intelligence.md", "test-reuse-intelligence.md", "xray-import.md", "test-generation-governance.md", "existing-test-discovery.md", "coverage-discovery.md", "coverage-delta-intelligence.md", "reuse-first-generation.md", "reuse-governance.md"],
  generate_ui_automation: ["application-exploration.md", "ui-automation-generation.md", "script-governance.md", "data-privacy-governance.md", "automation-repository-discovery.md", "framework-intelligence.md", "repository-standards-intelligence.md", "pipeline-intelligence.md", "existing-test-discovery.md", "existing-automation-intelligence.md", "coverage-discovery.md", "regression-impact-intelligence.md", "coverage-delta-intelligence.md", "reuse-first-generation.md", "reuse-governance.md"],
  generate_api_automation: ["api-intelligence.md", "api-automation-generation.md", "script-governance.md", "data-privacy-governance.md", "automation-repository-discovery.md", "framework-intelligence.md", "repository-standards-intelligence.md", "pipeline-intelligence.md", "existing-test-discovery.md", "existing-automation-intelligence.md", "coverage-discovery.md", "regression-impact-intelligence.md", "coverage-delta-intelligence.md", "reuse-first-generation.md", "reuse-governance.md"],
  generate_performance_tests: ["automation-strategy-selection.md", "performance-governance.md", "script-governance.md", "data-privacy-governance.md", "automation-repository-discovery.md", "framework-intelligence.md", "repository-standards-intelligence.md", "pipeline-intelligence.md", "existing-test-discovery.md", "existing-automation-intelligence.md", "coverage-discovery.md", "regression-impact-intelligence.md", "coverage-delta-intelligence.md", "reuse-first-generation.md", "reuse-governance.md"],
  run_pipeline: ["workflow-orchestration.md", "enterprise-quality-gate.md", "smart-regression-suite-builder.md", "reuse-governance.md"],
  generate_report: [],
  analyze_coverage: ["coverage-intelligence.md", "coverage-validation.md", "coverage-discovery.md", "coverage-delta-intelligence.md", "regression-impact-intelligence.md"],
  analyze_defects: ["failure-analysis.md"]
};

const promptsBySkill: Partial<Record<ProgressiveDisclosureSkill, ProgressiveDisclosurePromptContract[]>> = {
  "jira-intelligence": ["jira-story-processing.md", "requirement-governance.md", "requirement-analysis.md"],
  "github-intelligence": ["code-analysis.md", "source-impact-analysis.md", "requirement-code-validation.md"],
  "api-intelligence": ["api-intelligence.md", "api-automation-generation.md"],
  "playwright-intelligence": ["application-exploration.md", "ui-automation-generation.md"],
  "xray-intelligence": ["xray-repository-intelligence.md", "test-reuse-intelligence.md", "xray-import.md"],
  "coverage-intelligence": ["coverage-intelligence.md", "coverage-validation.md"],
  "performance-intelligence": ["automation-strategy-selection.md", "performance-governance.md"],
  "test-data-intelligence": ["test-data-intelligence.md", "data-privacy-governance.md"],
  "implementation-intelligence": ["code-analysis.md", "requirement-code-validation.md", "source-impact-analysis.md"],
  "existing-test-intelligence": ["reuse-first-generation.md", "reuse-governance.md"]
};

const ownerByIntent: Record<SupportedQualityIntent, string> = {
  analyze_story: "jira-agent",
  analyze_branch: "github-agent",
  generate_test_cases: "xray-agent",
  generate_xray_tests: "xray-agent",
  generate_ui_automation: "playwright-agent",
  generate_api_automation: "api-agent",
  generate_performance_tests: "governance-agent",
  run_pipeline: "governance-agent",
  generate_report: "reporting-agent",
  analyze_coverage: "coverage-agent",
  analyze_defects: "jira-agent"
};

const memoryByIntent: Record<SupportedQualityIntent, MemoryKnowledgeCategory[]> = {
  analyze_story: ["historical-stories"],
  analyze_branch: ["historical-prs", "merge-commit-references", "commit-lineage", "story-to-commit-relationships"],
  generate_test_cases: ["historical-stories", "historical-coverage", "existing-xray-tests", "reusable-patterns"],
  generate_xray_tests: ["historical-stories", "historical-coverage", "existing-xray-tests", "reusable-patterns"],
  generate_ui_automation: ["historical-coverage", "existing-xray-tests", "existing-automation"],
  generate_api_automation: ["historical-coverage", "existing-xray-tests", "existing-automation"],
  generate_performance_tests: ["historical-coverage", "existing-automation"],
  run_pipeline: [],
  generate_report: ["historical-coverage"],
  analyze_coverage: ["historical-coverage", "existing-xray-tests", "existing-automation"],
  analyze_defects: ["historical-stories", "defect-history"]
};

const memoryBySkill: Partial<Record<ProgressiveDisclosureSkill, MemoryKnowledgeCategory[]>> = {
  "jira-intelligence": ["historical-stories"],
  "xray-intelligence": ["historical-stories", "historical-coverage", "existing-xray-tests"],
  "coverage-intelligence": ["historical-coverage", "existing-xray-tests", "existing-automation"],
  "playwright-intelligence": ["historical-coverage", "existing-automation"],
  "api-intelligence": ["historical-coverage", "existing-automation"],
  "performance-intelligence": ["historical-coverage", "existing-automation"],
  "merge-traceability-intelligence": ["historical-prs", "merge-commit-references", "commit-lineage", "story-to-commit-relationships"],
  "commit-reconstruction-intelligence": ["historical-prs", "merge-commit-references", "commit-lineage", "story-to-commit-relationships"],
  "implementation-intelligence": ["story-to-commit-relationships"],
  "existing-test-intelligence": ["historical-coverage", "existing-xray-tests", "existing-automation", "reusable-patterns"]
};

const agentBySkill: Record<ProgressiveDisclosureSkill, string> = {
  "jira-intelligence": "jira-agent",
  "github-intelligence": "github-agent",
  "adr-intelligence": "github-agent",
  "api-intelligence": "api-agent",
  "playwright-intelligence": "playwright-agent",
  "xray-intelligence": "xray-agent",
  "coverage-intelligence": "coverage-agent",
  governance: "governance-agent",
  reporting: "reporting-agent",
  "performance-intelligence": "governance-agent",
  "test-data-intelligence": "governance-agent",
  "merge-traceability-intelligence": "merge-traceability-agent",
  "commit-reconstruction-intelligence": "commit-reconstruction-agent",
  "implementation-intelligence": "github-agent",
  "existing-test-intelligence": "governance-agent"
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function selectProgressiveDisclosureRoute(input: ProgressiveDisclosureInput): ProgressiveDisclosureRoute {
  const selectedSkills = new Set<ProgressiveDisclosureSkill>(["governance"]);
  const supportingAgents: string[] = [];
  if (input.intent !== "unclassified") {
    skillSelection[input.intent].forEach((skill) => selectedSkills.add(skill));
    (input.requestedCapabilities ?? []).forEach((skill) => selectedSkills.add(skill));
  } else {
    (input.requestedCapabilities ?? []).forEach((skill) => selectedSkills.add(skill));
  }

  if (selectedSkills.has("existing-test-intelligence")) {
    selectedSkills.add("github-intelligence");
    selectedSkills.add("implementation-intelligence");
    selectedSkills.add("coverage-intelligence");
  }

  const githubRequested = selectedSkills.has("github-intelligence");
  let branchResolution: ProgressiveDisclosureRoute["branchResolution"] = githubRequested ? "pending" : "not-required";
  if (githubRequested) {
    const branch = input.repositoryContext?.branchExists;
    if (branch?.status === "available" && branch.value === true) {
      selectedSkills.add("implementation-intelligence");
      branchResolution = "direct-branch";
    } else if (branch?.status === "available" && branch.value === false) {
      selectedSkills.add("merge-traceability-intelligence");
      selectedSkills.add("commit-reconstruction-intelligence");
      selectedSkills.add("implementation-intelligence");
      supportingAgents.push("merge-traceability-agent", "commit-reconstruction-agent");
      branchResolution = "reconstruction";
    }
  }

  const primaryAgent = input.intent === "unclassified" ? "no_catalog_match" : ownerByIntent[input.intent];
  const prompts = new Set<ProgressiveDisclosurePromptContract>(input.intent === "unclassified" ? [] : promptsByIntent[input.intent]);
  for (const prompt of input.requestedPromptContracts ?? []) prompts.add(prompt);
  for (const skill of selectedSkills) for (const prompt of promptsBySkill[skill] ?? []) prompts.add(prompt);
  const memory = new Set<MemoryKnowledgeCategory>(input.intent === "unclassified" ? [] : memoryByIntent[input.intent]);
  for (const skill of selectedSkills) for (const category of memoryBySkill[skill] ?? []) memory.add(category);
  const branchFact = input.repositoryContext?.branchExists;
  if (githubRequested && !(branchFact?.status === "available" && branchFact.value === true)) {
    for (const category of ["historical-prs", "merge-commit-references", "commit-lineage", "story-to-commit-relationships"] as const) memory.add(category);
  }
  if (githubRequested && branchFact?.status === "available" && branchFact.value === true && input.intent === "analyze_branch") {
    for (const category of ["historical-prs", "merge-commit-references", "commit-lineage", "story-to-commit-relationships"] as const) memory.delete(category);
  }
  for (const skill of selectedSkills) {
    const supportingAgent = agentBySkill[skill];
    if (supportingAgent !== primaryAgent) supportingAgents.push(supportingAgent);
  }
  return {
    intent: input.intent,
    primaryAgent,
    supportingAgents: unique(supportingAgents),
    catalogsConsulted: ["intent.md", "context.md", "agents.md", "memory.md", "skills/"],
    memoryCategories: unique([...memory]),
    selectedSkills: [...selectedSkills],
    selectedPromptContracts: [...prompts],
    branchResolution,
    fallback: input.intent === "unclassified" ? "existing-prompt-library" : null
  };
}

export async function loadSelectedSkillMetadata(projectRoot: string, route: ProgressiveDisclosureRoute): Promise<LoadedProgressiveDisclosureSkills> {
  const loaded: LoadedProgressiveDisclosureSkills["loaded"] = [];
  const unavailable: ProgressiveDisclosureSkill[] = [];
  const root = resolve(projectRoot);
  const catalogRoot = resolve(root, "skills");
  for (const skill of unique(route.selectedSkills)) {
    const filePath = resolve(catalogRoot, skill, "skill.md");
    if (!filePath.startsWith(`${catalogRoot}${sep}`)) throw new Error(`Skill metadata path escapes the catalog root: ${skill}.`);
    try {
      const content = await readFile(filePath, "utf8");
      loaded.push({ name: skill, content });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      unavailable.push(skill);
    }
  }
  return {
    loaded,
    unavailable,
    fallback: unavailable.length > 0 ? "existing-prompt-library" : route.fallback
  };
}

export async function loadSelectedPromptContracts(projectRoot: string, route: ProgressiveDisclosureRoute): Promise<LoadedProgressiveDisclosurePrompts> {
  const loaded: LoadedProgressiveDisclosurePrompts["loaded"] = [];
  const unavailable: ProgressiveDisclosurePromptContract[] = [];
  const root = resolve(projectRoot);
  const promptRoot = resolve(root, "prompts");
  for (const prompt of unique(route.selectedPromptContracts)) {
    const filePath = resolve(promptRoot, prompt);
    if (!filePath.startsWith(`${promptRoot}${sep}`)) throw new Error(`Prompt contract path escapes the prompt root: ${prompt}.`);
    try {
      loaded.push({ name: prompt, content: await readFile(filePath, "utf8") });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      unavailable.push(prompt);
    }
  }
  return {
    loaded,
    unavailable,
    fallback: unavailable.length > 0 ? "existing-prompt-library" : route.fallback
  };
}