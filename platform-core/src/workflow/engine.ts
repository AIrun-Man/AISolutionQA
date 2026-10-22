export type WorkflowSourceType = "jira-story" | "requirement-document" | "pull-request";
export type WorkflowCondition =
  | "always"
  | "reuse-governance-passed"
  | "xray-enabled-and-reuse-governance-passed"
  | "jira-source-and-reuse-governance-passed"
  | "ui-candidates-and-reuse-governance-passed"
  | "api-candidates-api-and-reuse-governance-passed"
  | "contract-candidates-and-reuse-governance-passed"
  | "component-candidates-and-reuse-governance-passed"
  | "performance-governance-and-reuse-passed"
  | "ui-candidates-present"
  | "api-candidates-present"
  | "contract-candidates-present"
  | "component-candidates-present"
  | "performance-candidates-present"
  | "automation-generated"
  | "automation-generated-and-coverage-and-readiness-passed"
  | "jira-source-with-automation"
  | "coverage-governance-passed"
  | "xray-enabled"
  | "xray-auto-import"
  | "api-candidates-and-governance-passed"
  | "coverage-and-readiness-passed"
  | "repository-reference-found"
  | "feature-branch-missing"
  | "reconstruction-sources-found"
  | "implementation-source-trust-passed"
  | "implementation-source-approved"
  | "adr-documents-present"
  | "requirement-governance-passed"
  | "test-governance-passed"
  | "performance-governance-passed"
  | "hallucination-and-privacy-passed"
  | "script-governance-passed"
  | "enterprise-quality-gate-passed"
  | "enterprise-gate-coverage-readiness-passed"
  | "failed-execution"
  | "product-defect"
  | "jira-source"
  | "pull-request-source"
  | "execution-history-present";

export type QualityWorkflowStage =
  | "source-context"
  | "requirement-governance"
  | "requirements-analysis"
  | "historical-jira-context"
  | "feature-branch-discovery"
  | "merge-traceability-discovery"
  | "implementation-trust-validation"
  | "commit-reconstruction"
  | "repository-acquisition"
  | "implementation-analysis"
  | "automation-repository-discovery"
  | "framework-intelligence"
  | "repository-standards-intelligence"
  | "pipeline-intelligence"
  | "existing-test-discovery"
  | "existing-automation-intelligence"
  | "coverage-discovery"
  | "regression-impact-analysis"
  | "coverage-delta-analysis"
  | "reuse-first-strategy"
  | "reuse-governance"
  | "adr-discovery"
  | "evidence-correlation"
  | "scenario-generation"
  | "test-case-generation"
  | "test-generation-governance"
  | "requirement-to-code-traceability"
  | "xray-import-artifact-generation"
  | "xray-import-execution"
  | "jira-test-case-creation"
  | "coverage-review"
  | "api-portal-discovery"
  | "api-contract-analysis"
  | "requirement-api-correlation"
  | "api-code-correlation"
  | "api-risk-analysis"
  | "api-coverage-analysis"
  | "api-test-design"
  | "xray-api-test-creation"
  | "api-coverage-governance"
  | "api-automation-planning"
  | "application-discovery"
  | "xray-repository-analysis"
  | "existing-test-reuse-analysis"
  | "environment-intelligence"
  | "test-data-analysis"
  | "performance-governance"
  | "script-governance"
  | "hallucination-validation"
  | "privacy-validation"
  | "enterprise-quality-gate"
  | "requirement-code-validation"
  | "source-impact-analysis"
  | "risk-assessment"
  | "automation-strategy-selection"
  | "automation-design"
  | "playwright-generation"
  | "api-generation"
  | "contract-generation"
  | "component-generation"
  | "performance-generation"
  | "test-selection"
  | "smart-regression-suite-builder"
  | "execution-recommendation"
  | "github-actions-compatibility-validation"
  | "automation-branch-creation"
  | "automation-commit-creation"
  | "pull-request-creation"
  | "jira-automation-linking"
  | "coverage-matrix-creation"
  | "gap-analysis"
  | "risk-analysis"
  | "coverage-governance-validation"
  | "readiness-assessment"
  | "github-actions-execution"
  | "automation-promotion"
  | "failure-analysis"
  | "jira-defect-creation"
  | "jira-execution-sync"
  | "coverage-reporting"
  | "traceability-reporting"
  | "pull-request-review"
  | "test-maintenance"
  | "executive-report";

export interface WorkflowStagePlan {
  stage: QualityWorkflowStage;
  dependsOn: QualityWorkflowStage[];
  condition: WorkflowCondition;
}

export interface QualityWorkflowPlan {
  schemaVersion: "1.0.0";
  sourceType: WorkflowSourceType;
  stages: WorkflowStagePlan[];
}

export type AutomationStrategy = "ui-test" | "api-test" | "contract-test" | "component-test" | "performance-test";
export type RequirementEvidenceType = "functional" | "non-functional" | "business-rule" | "validation" | "security";
export type ImplementationSurface = "ui" | "api" | "contract" | "component" | "performance";

export interface AutomationStrategyEvidence {
  requirementId: string;
  requirementType: RequirementEvidenceType;
  implementationSurface: ImplementationSurface;
  changedFiles: string[];
  rationale: string;
}

export interface AutomationStrategyDecision {
  strategy: AutomationStrategy;
  requirementIds: string[];
  implementationSurfaces: ImplementationSurface[];
  evidenceFiles: string[];
  rationale: string[];
}

const strategyBySurface: Record<ImplementationSurface, AutomationStrategy> = {
  ui: "ui-test",
  api: "api-test",
  contract: "contract-test",
  component: "component-test",
  performance: "performance-test"
};

export function selectAutomationStrategies(evidence: AutomationStrategyEvidence[]): AutomationStrategyDecision[] {
  const decisions = new Map<AutomationStrategy, AutomationStrategyDecision>();

  for (const item of evidence) {
    if (!item.requirementId.trim() || !item.rationale.trim() || item.changedFiles.length === 0) {
      throw new Error("Automation strategy evidence requires a requirement, rationale, and changed source files.");
    }
    if (item.implementationSurface === "performance" && item.requirementType !== "non-functional") {
      throw new Error(`Performance testing requires non-functional requirement evidence: ${item.requirementId}.`);
    }

    const strategy = strategyBySurface[item.implementationSurface];
    const decision = decisions.get(strategy) ?? {
      strategy,
      requirementIds: [],
      implementationSurfaces: [],
      evidenceFiles: [],
      rationale: []
    };
    if (!decision.requirementIds.includes(item.requirementId)) decision.requirementIds.push(item.requirementId);
    if (!decision.implementationSurfaces.includes(item.implementationSurface)) decision.implementationSurfaces.push(item.implementationSurface);
    for (const path of item.changedFiles) {
      if (!decision.evidenceFiles.includes(path)) decision.evidenceFiles.push(path);
    }
    if (!decision.rationale.includes(item.rationale)) decision.rationale.push(item.rationale);
    decisions.set(strategy, decision);
  }

  return [...decisions.values()];
}

export function createQualityWorkflowPlan(sourceType: WorkflowSourceType): QualityWorkflowPlan {
  const stages: WorkflowStagePlan[] = [
    { stage: "source-context", dependsOn: [], condition: "always" },
    { stage: "requirement-governance", dependsOn: ["source-context"], condition: "always" },
    { stage: "requirements-analysis", dependsOn: ["source-context", "requirement-governance"], condition: "requirement-governance-passed" },
    { stage: "historical-jira-context", dependsOn: ["source-context", "requirements-analysis"], condition: "jira-source" },
    { stage: "feature-branch-discovery", dependsOn: ["source-context", "requirements-analysis", "historical-jira-context"], condition: "jira-source" },
    { stage: "merge-traceability-discovery", dependsOn: ["feature-branch-discovery"], condition: "feature-branch-missing" },
    { stage: "implementation-trust-validation", dependsOn: ["merge-traceability-discovery"], condition: "feature-branch-missing" },
    { stage: "commit-reconstruction", dependsOn: ["implementation-trust-validation"], condition: "implementation-source-trust-passed" },
    { stage: "repository-acquisition", dependsOn: ["feature-branch-discovery"], condition: "implementation-source-approved" },
    { stage: "implementation-analysis", dependsOn: ["source-context", "requirements-analysis", "repository-acquisition"], condition: "always" },
    { stage: "automation-repository-discovery", dependsOn: ["implementation-analysis"], condition: "always" },
    { stage: "framework-intelligence", dependsOn: ["automation-repository-discovery"], condition: "always" },
    { stage: "repository-standards-intelligence", dependsOn: ["framework-intelligence"], condition: "always" },
    { stage: "pipeline-intelligence", dependsOn: ["repository-standards-intelligence"], condition: "always" },
    { stage: "api-portal-discovery", dependsOn: ["source-context", "requirements-analysis", "implementation-analysis"], condition: "api-candidates-present" },
    { stage: "api-contract-analysis", dependsOn: ["api-portal-discovery"], condition: "api-candidates-present" },
    { stage: "requirement-code-validation", dependsOn: ["requirements-analysis", "implementation-analysis"], condition: "always" },
    { stage: "requirement-api-correlation", dependsOn: ["requirements-analysis", "api-contract-analysis"], condition: "api-candidates-present" },
    { stage: "api-code-correlation", dependsOn: ["implementation-analysis", "api-contract-analysis", "requirement-api-correlation"], condition: "api-candidates-present" },
    { stage: "adr-discovery", dependsOn: ["implementation-analysis"], condition: "adr-documents-present" },
    { stage: "application-discovery", dependsOn: ["requirements-analysis", "implementation-analysis"], condition: "ui-candidates-present" },
    { stage: "xray-repository-analysis", dependsOn: ["source-context", "requirements-analysis", "historical-jira-context"], condition: "xray-enabled" },
    { stage: "existing-test-discovery", dependsOn: ["pipeline-intelligence", "xray-repository-analysis"], condition: "always" },
    { stage: "existing-automation-intelligence", dependsOn: ["existing-test-discovery", "automation-repository-discovery", "repository-standards-intelligence"], condition: "always" },
    { stage: "coverage-discovery", dependsOn: ["existing-test-discovery", "existing-automation-intelligence", "implementation-analysis"], condition: "always" },
    { stage: "source-impact-analysis", dependsOn: ["implementation-analysis"], condition: "always" },
    { stage: "risk-assessment", dependsOn: ["requirement-code-validation", "source-impact-analysis"], condition: "always" },
    { stage: "existing-test-reuse-analysis", dependsOn: ["requirements-analysis", "application-discovery", "xray-repository-analysis", "existing-test-discovery", "coverage-discovery"], condition: "always" },
    { stage: "regression-impact-analysis", dependsOn: ["source-impact-analysis", "coverage-discovery", "existing-automation-intelligence"], condition: "always" },
    { stage: "coverage-delta-analysis", dependsOn: ["coverage-discovery", "regression-impact-analysis", "existing-test-reuse-analysis"], condition: "always" },
    { stage: "reuse-first-strategy", dependsOn: ["coverage-delta-analysis", "existing-test-reuse-analysis", "existing-automation-intelligence"], condition: "always" },
    { stage: "reuse-governance", dependsOn: ["reuse-first-strategy", "existing-test-discovery", "existing-automation-intelligence", "coverage-delta-analysis"], condition: "always" },
    { stage: "environment-intelligence", dependsOn: ["source-context", "api-contract-analysis"], condition: "always" },
    { stage: "test-data-analysis", dependsOn: ["requirements-analysis", "implementation-analysis", "application-discovery", "api-contract-analysis", "environment-intelligence"], condition: "always" },
    { stage: "evidence-correlation", dependsOn: ["requirements-analysis", "historical-jira-context", "implementation-analysis", "adr-discovery", "api-contract-analysis", "requirement-api-correlation", "api-code-correlation", "application-discovery", "xray-repository-analysis", "existing-test-reuse-analysis", "environment-intelligence", "test-data-analysis"], condition: "always" },
    { stage: "scenario-generation", dependsOn: ["requirements-analysis", "reuse-first-strategy", "reuse-governance"], condition: "always" },
    { stage: "test-case-generation", dependsOn: ["scenario-generation", "implementation-analysis", "requirement-code-validation", "evidence-correlation", "existing-test-reuse-analysis", "reuse-first-strategy", "reuse-governance", "test-data-analysis"], condition: "reuse-governance-passed" },
    { stage: "test-generation-governance", dependsOn: ["test-case-generation", "existing-test-reuse-analysis", "application-discovery"], condition: "always" },
    { stage: "coverage-review", dependsOn: ["requirement-code-validation", "test-case-generation", "test-generation-governance"], condition: "always" },
    { stage: "xray-import-artifact-generation", dependsOn: ["test-case-generation", "test-generation-governance", "coverage-review", "reuse-governance"], condition: "xray-enabled-and-reuse-governance-passed" },
    { stage: "xray-import-execution", dependsOn: ["xray-import-artifact-generation"], condition: "xray-auto-import" },
    { stage: "jira-test-case-creation", dependsOn: ["test-case-generation", "test-generation-governance", "coverage-review", "xray-import-artifact-generation", "xray-import-execution", "reuse-governance"], condition: "jira-source-and-reuse-governance-passed" },
    { stage: "api-risk-analysis", dependsOn: ["requirement-api-correlation", "api-code-correlation"], condition: "api-candidates-present" },
    { stage: "api-coverage-analysis", dependsOn: ["api-contract-analysis", "requirement-api-correlation", "api-code-correlation", "test-case-generation"], condition: "api-candidates-present" },
    { stage: "api-test-design", dependsOn: ["api-coverage-analysis", "test-case-generation", "risk-assessment"], condition: "api-candidates-present" },
    { stage: "xray-api-test-creation", dependsOn: ["api-test-design", "jira-test-case-creation"], condition: "xray-enabled" },
    { stage: "api-coverage-governance", dependsOn: ["api-test-design", "api-risk-analysis", "api-coverage-analysis"], condition: "api-candidates-present" },
    { stage: "api-automation-planning", dependsOn: ["api-test-design", "api-coverage-governance"], condition: "api-candidates-present" },
    { stage: "automation-strategy-selection", dependsOn: ["test-case-generation", "jira-test-case-creation", "implementation-analysis", "risk-assessment", "coverage-review", "api-automation-planning", "reuse-first-strategy", "framework-intelligence", "repository-standards-intelligence"], condition: "always" },
    { stage: "automation-design", dependsOn: ["automation-strategy-selection"], condition: "always" },
    { stage: "performance-governance", dependsOn: ["automation-design", "environment-intelligence"], condition: "always" },
    { stage: "playwright-generation", dependsOn: ["automation-design", "application-discovery", "test-data-analysis", "reuse-first-strategy", "existing-automation-intelligence", "reuse-governance"], condition: "ui-candidates-and-reuse-governance-passed" },
    { stage: "api-generation", dependsOn: ["automation-design", "api-automation-planning", "api-coverage-governance", "environment-intelligence", "test-data-analysis", "reuse-first-strategy", "existing-automation-intelligence", "reuse-governance"], condition: "api-candidates-api-and-reuse-governance-passed" },
    { stage: "contract-generation", dependsOn: ["automation-design", "reuse-first-strategy", "reuse-governance"], condition: "contract-candidates-and-reuse-governance-passed" },
    { stage: "component-generation", dependsOn: ["automation-design", "reuse-first-strategy", "reuse-governance"], condition: "component-candidates-and-reuse-governance-passed" },
    { stage: "performance-generation", dependsOn: ["automation-design", "performance-governance", "reuse-first-strategy", "reuse-governance"], condition: "performance-governance-and-reuse-passed" },
    { stage: "script-governance", dependsOn: ["playwright-generation", "api-generation", "contract-generation", "component-generation", "performance-generation"], condition: "always" },
    { stage: "hallucination-validation", dependsOn: ["evidence-correlation", "application-discovery", "api-contract-analysis", "test-case-generation", "playwright-generation", "api-generation", "performance-generation"], condition: "always" },
    { stage: "privacy-validation", dependsOn: ["test-case-generation", "playwright-generation", "api-generation", "performance-generation", "test-data-analysis"], condition: "always" },
    { stage: "requirement-to-code-traceability", dependsOn: ["test-case-generation", "playwright-generation", "api-generation", "contract-generation", "component-generation", "performance-generation"], condition: "always" },
    { stage: "test-selection", dependsOn: ["source-impact-analysis", "playwright-generation", "api-generation", "contract-generation", "component-generation", "performance-generation", "regression-impact-analysis"], condition: "always" },
    { stage: "smart-regression-suite-builder", dependsOn: ["test-selection", "regression-impact-analysis", "coverage-delta-analysis", "existing-test-discovery"], condition: "always" },
    { stage: "coverage-matrix-creation", dependsOn: ["test-case-generation", "playwright-generation", "api-generation", "contract-generation", "component-generation", "performance-generation", "requirement-to-code-traceability", "xray-repository-analysis", "existing-test-reuse-analysis", "test-generation-governance"], condition: "always" },
    { stage: "gap-analysis", dependsOn: ["coverage-matrix-creation"], condition: "always" },
    { stage: "risk-analysis", dependsOn: ["gap-analysis"], condition: "always" },
    { stage: "coverage-governance-validation", dependsOn: ["coverage-review", "coverage-matrix-creation", "risk-analysis"], condition: "always" },
    { stage: "readiness-assessment", dependsOn: ["coverage-governance-validation", "api-coverage-governance", "requirement-to-code-traceability", "application-discovery", "existing-test-reuse-analysis", "environment-intelligence", "test-data-analysis"], condition: "always" },
    { stage: "enterprise-quality-gate", dependsOn: ["requirement-governance", "test-generation-governance", "script-governance", "performance-governance", "hallucination-validation", "privacy-validation", "coverage-governance-validation", "readiness-assessment", "implementation-trust-validation", "reuse-governance"], condition: "always" },
    { stage: "execution-recommendation", dependsOn: ["smart-regression-suite-builder", "pipeline-intelligence", "enterprise-quality-gate"], condition: "always" },
    { stage: "automation-branch-creation", dependsOn: ["test-selection", "enterprise-quality-gate", "coverage-governance-validation", "readiness-assessment", "execution-recommendation"], condition: "enterprise-gate-coverage-readiness-passed" },
    { stage: "automation-commit-creation", dependsOn: ["automation-branch-creation"], condition: "automation-generated" },
    { stage: "pull-request-creation", dependsOn: ["automation-commit-creation"], condition: "automation-generated" },
    { stage: "jira-automation-linking", dependsOn: ["jira-test-case-creation", "pull-request-creation", "test-selection"], condition: "jira-source-with-automation" },
    { stage: "github-actions-compatibility-validation", dependsOn: ["execution-recommendation", "pipeline-intelligence", "pull-request-creation"], condition: "always" },
    { stage: "github-actions-execution", dependsOn: ["test-selection", "pull-request-creation", "jira-automation-linking", "enterprise-quality-gate", "coverage-governance-validation", "readiness-assessment", "github-actions-compatibility-validation"], condition: "enterprise-quality-gate-passed" },
    { stage: "automation-promotion", dependsOn: ["github-actions-execution", "coverage-governance-validation"], condition: "coverage-governance-passed" },
    { stage: "failure-analysis", dependsOn: ["github-actions-execution"], condition: "failed-execution" },
    { stage: "jira-defect-creation", dependsOn: ["failure-analysis"], condition: "product-defect" },
    { stage: "coverage-reporting", dependsOn: ["github-actions-execution", "coverage-matrix-creation", "gap-analysis", "risk-analysis", "coverage-governance-validation"], condition: "always" },
    { stage: "traceability-reporting", dependsOn: ["coverage-reporting", "test-case-generation"], condition: "always" },
    { stage: "jira-execution-sync", dependsOn: ["coverage-reporting", "traceability-reporting", "github-actions-execution", "jira-automation-linking"], condition: "jira-source" },
    { stage: "pull-request-review", dependsOn: ["source-impact-analysis", "coverage-reporting"], condition: "pull-request-source" },
    { stage: "test-maintenance", dependsOn: ["github-actions-execution", "coverage-reporting"], condition: "execution-history-present" },
    { stage: "executive-report", dependsOn: ["coverage-reporting", "traceability-reporting"], condition: "always" }
  ];

  return { schemaVersion: "1.0.0", sourceType, stages };
}

export function validateQualityWorkflowPlan(plan: QualityWorkflowPlan): string[] {
  const errors: string[] = [];
  const stageIds = new Set(plan.stages.map((stage) => stage.stage));
  if (stageIds.size !== plan.stages.length) errors.push("Workflow stage identifiers must be unique.");

  const visited = new Set<QualityWorkflowStage>();
  for (const stage of plan.stages) {
    for (const dependency of stage.dependsOn) {
      if (!stageIds.has(dependency)) {
        errors.push(`Stage ${stage.stage} references unknown dependency ${dependency}.`);
      } else if (!visited.has(dependency)) {
        errors.push(`Stage ${stage.stage} depends on ${dependency}, which is not ordered before it.`);
      }
    }
    visited.add(stage.stage);
  }
  return errors;
}