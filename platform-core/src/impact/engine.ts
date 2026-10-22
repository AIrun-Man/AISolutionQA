export interface SourceImpactMapping {
  path: string;
  moduleId: string;
  requirementIds: string[];
  testCaseIds: string[];
  automationIds: string[];
}

export interface SourceImpactReport {
  changedFiles: string[];
  impactedModuleIds: string[];
  impactedRequirementIds: string[];
  impactedTestCaseIds: string[];
  impactedAutomationIds: string[];
  unmappedFiles: string[];
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").toLowerCase();
}

export function analyzeSourceImpact(changedFiles: string[], mappings: SourceImpactMapping[]): SourceImpactReport {
  const normalizedChangedFiles = [...new Set(changedFiles.map(normalizePath))].sort();
  const mappingByPath = new Map<string, SourceImpactMapping[]>();
  for (const mapping of mappings) {
    const key = normalizePath(mapping.path);
    const entries = mappingByPath.get(key) ?? [];
    entries.push(mapping);
    mappingByPath.set(key, entries);
  }

  const moduleIds = new Set<string>();
  const requirementIds = new Set<string>();
  const testCaseIds = new Set<string>();
  const automationIds = new Set<string>();
  const unmappedFiles: string[] = [];

  for (const file of normalizedChangedFiles) {
    const matches = mappingByPath.get(file);
    if (!matches?.length) {
      unmappedFiles.push(file);
      continue;
    }
    for (const mapping of matches) {
      moduleIds.add(mapping.moduleId);
      mapping.requirementIds.forEach((id) => requirementIds.add(id));
      mapping.testCaseIds.forEach((id) => testCaseIds.add(id));
      mapping.automationIds.forEach((id) => automationIds.add(id));
    }
  }

  return {
    changedFiles: normalizedChangedFiles,
    impactedModuleIds: [...moduleIds].sort(),
    impactedRequirementIds: [...requirementIds].sort(),
    impactedTestCaseIds: [...testCaseIds].sort(),
    impactedAutomationIds: [...automationIds].sort(),
    unmappedFiles
  };
}