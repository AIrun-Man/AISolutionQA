export type ImplementationSourceKind = "feature-branch" | "pull-request" | "merge-commit" | "commit-history" | "repository-diff";
export type SourceDiscoveryStatus = "available" | "unavailable" | "not_checked" | "unknown";
export type ImplementationChangeType = "added" | "modified" | "deleted";
export type ImplementationChangeArea = "api" | "ui-component" | "business-logic" | "validation" | "data-access" | "error-handling" | "other";
export type PullRequestState = "open" | "closed" | "merged";
export type MergeStrategy = "merge" | "squash" | "rebase" | "unknown";

export interface FeatureBranchDiscoveryEvidence {
  repository: string;
  name: string | null;
  exists: boolean | null;
  status: SourceDiscoveryStatus;
  linkedStoryKeys: string[];
  reference?: string;
  changedFiles?: Array<{ path: string; changeType: ImplementationChangeType }>;
}

export interface PullRequestEvidence {
  id: string;
  url: string;
  repository: string;
  sourceBranch: string;
  targetBranch: string;
  state: PullRequestState;
  mergeStrategy: MergeStrategy;
  linkedStoryKeys: string[];
  commitShas: string[];
  mergeCommitSha?: string;
  changedFiles: Array<{ path: string; changeType: ImplementationChangeType }>;
}

export interface CommitEvidence {
  sha: string;
  repository: string;
  message: string;
  parentShas: string[];
  linkedStoryKeys: string[];
  pullRequestIds: string[];
  branches?: string[];
  isMergeCommit: boolean;
  changedFiles: Array<{ path: string; changeType: ImplementationChangeType }>;
}

export interface RepositoryDiffEvidence {
  id: string;
  repository: string;
  baseSha: string;
  headSha: string;
  baseBranch?: string;
  linkedStoryKeys: string[];
  reference: string;
  changedFiles: Array<{ path: string; changeType: ImplementationChangeType }>;
}

export interface HistoricalImplementationReference {
  id: string;
  kind: "pull-request" | "merge-commit" | "commit" | "story-commit";
  storyKey: string;
  repository: string;
  reference: string;
  relatedShas: string[];
}

export interface RepositoryContextFact {
  status: SourceDiscoveryStatus;
  value: boolean | null;
  references: string[];
}

export interface RepositoryContextModel {
  branchExists: RepositoryContextFact;
  pullRequestExists: RepositoryContextFact;
  mergeCommitExists: RepositoryContextFact;
  commitHistoryAvailable: RepositoryContextFact;
  reconstructionRequired: RepositoryContextFact;
}

export interface ImplementationSourceInput {
  storyKey: string;
  repository: string;
  featureBranch: FeatureBranchDiscoveryEvidence;
  pullRequests?: PullRequestEvidence[];
  commits?: CommitEvidence[];
  repositoryDiffs?: RepositoryDiffEvidence[];
  historicalReferences?: HistoricalImplementationReference[];
  repositoryContext?: Partial<RepositoryContextModel>;
}

export interface LinkedPullRequest extends PullRequestEvidence {
  association: "story-link" | "feature-branch-link";
}

export interface ImplementationChangedFile {
  path: string;
  changeType: ImplementationChangeType;
  sourceReferences: string[];
}

export interface ImplementationSourceModel {
  schemaVersion: "1.0.0";
  storyKey: string;
  repository: string;
  featureBranch: FeatureBranchDiscoveryEvidence;
  repositoryContext: RepositoryContextModel;
  reconstructionRequired: boolean | null;
  selectedSource: ImplementationSourceKind | null;
  discoveryStatus: SourceDiscoveryStatus;
  pullRequests: LinkedPullRequest[];
  mergeCommits: CommitEvidence[];
  commits: CommitEvidence[];
  repositoryDiffs: RepositoryDiffEvidence[];
  changedFiles: ImplementationChangedFile[];
  sourceShas: string[];
  memoryLeads: HistoricalImplementationReference[];
  ambiguityFindings: string[];
  unrelatedCommitShas: string[];
  incorrectBranchMappings: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizedPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").toLocaleLowerCase("en-US");
}

function validateSourceInput(input: ImplementationSourceInput): void {
  if (!/^[A-Z][A-Z0-9]+-[1-9][0-9]*$/.test(input.storyKey)) throw new Error("Implementation source discovery requires a valid Jira story key.");
  if (!input.repository.trim() || input.featureBranch.repository !== input.repository) throw new Error("Feature branch and implementation sources must belong to the requested repository.");
  if (input.featureBranch.status === "available" && input.featureBranch.exists === null) throw new Error("Available feature-branch discovery must state whether the branch exists.");
  if (input.featureBranch.status !== "available" && input.featureBranch.exists !== null) throw new Error("Unresolved feature-branch discovery must use a null exists value.");
}

function addChangedFiles(
  target: Map<string, ImplementationChangedFile>,
  files: Array<{ path: string; changeType: ImplementationChangeType }>,
  reference: string
): void {
  for (const file of files) {
    if (!file.path.trim()) continue;
    const key = normalizedPath(file.path);
    const existing = target.get(key);
    if (!existing) {
      target.set(key, { path: file.path.replaceAll("\\", "/").replace(/^\.\//, ""), changeType: file.changeType, sourceReferences: [reference] });
      continue;
    }
    existing.sourceReferences = unique([...existing.sourceReferences, reference]);
  }
}

function hasStoryLink(storyKey: string, storyKeys: string[]): boolean {
  return storyKeys.includes(storyKey);
}

export function discoverImplementationSources(input: ImplementationSourceInput): ImplementationSourceModel {
  validateSourceInput(input);
  const storyKey = input.storyKey;
  const repository = input.repository;
  const branch = input.featureBranch;
  const branchMapsToStory = hasStoryLink(storyKey, branch.linkedStoryKeys);
  const pullRequests = (input.pullRequests ?? [])
    .filter((item) => item.repository === repository)
    .flatMap((item): LinkedPullRequest[] => {
      const storyLinked = hasStoryLink(storyKey, item.linkedStoryKeys);
      const branchLinked = Boolean(branch.name && branchMapsToStory && item.sourceBranch === branch.name);
      if (!storyLinked && !branchLinked) return [];
      return [{ ...item, association: storyLinked ? "story-link" : "feature-branch-link" }];
    });

  const pullRequestIds = new Set(pullRequests.map((item) => item.id));
  const pullRequestCommitShas = new Set(pullRequests.flatMap((item) => item.commitShas));
  const mergeCommitShas = new Set(pullRequests.flatMap((item) => item.mergeCommitSha ? [item.mergeCommitSha] : []));
  const repositoryCommits = (input.commits ?? []).filter((item) => item.repository === repository);
  const commits = repositoryCommits.filter((item) =>
    hasStoryLink(storyKey, item.linkedStoryKeys)
    || item.pullRequestIds.some((id) => pullRequestIds.has(id))
    || pullRequestCommitShas.has(item.sha)
    || mergeCommitShas.has(item.sha)
  );
  const mergeCommits = commits.filter((item) => item.isMergeCommit || mergeCommitShas.has(item.sha));
  const repositoryDiffs = (input.repositoryDiffs ?? []).filter((item) =>
    item.repository === repository && hasStoryLink(storyKey, item.linkedStoryKeys)
  );

  const ambiguityFindings: string[] = [];
  const incorrectBranchMappings: string[] = [];
  if (branch.exists === true && !branchMapsToStory) {
    incorrectBranchMappings.push(`Feature branch ${branch.name ?? "(unnamed)"} is not explicitly linked to ${storyKey}.`);
  }
  if (branch.name) {
    for (const pullRequest of pullRequests) {
      if (pullRequest.sourceBranch !== branch.name && pullRequest.association === "story-link") {
        incorrectBranchMappings.push(`Pull request ${pullRequest.id} source branch does not match ${branch.name}.`);
      }
    }
  }
  for (let leftIndex = 0; leftIndex < pullRequests.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < pullRequests.length; rightIndex += 1) {
      const left = pullRequests[leftIndex]!;
      const right = pullRequests[rightIndex]!;
      const sharedCommit = left.commitShas.some((sha) => right.commitShas.includes(sha));
      const relatedBranches = left.sourceBranch === right.sourceBranch || left.targetBranch === right.sourceBranch || right.targetBranch === left.sourceBranch;
      if (!sharedCommit && !relatedBranches) ambiguityFindings.push(`Pull requests ${left.id} and ${right.id} are independently linked to ${storyKey} with no shared lineage.`);
    }
  }
  const unrelatedCommitShas = repositoryCommits
    .filter((item) => !commits.some((linked) => linked.sha === item.sha))
    .map((item) => item.sha);

  const branchSourceAvailable = branch.status === "available" && branch.exists === true && branchMapsToStory;
  const selectedSource: ImplementationSourceKind | null = branchSourceAvailable ? "feature-branch"
    : pullRequests.length > 0 ? "pull-request"
      : mergeCommits.length > 0 ? "merge-commit"
        : commits.length > 0 ? "commit-history"
          : repositoryDiffs.length > 0 ? "repository-diff"
            : null;
  const reconstructionRequired = branch.exists === false ? true : branch.exists === true ? false : null;
  const discoveryStatus: SourceDiscoveryStatus = selectedSource ? "available"
    : branch.status === "unknown" || branch.status === "not_checked" ? branch.status
      : "unavailable";

  const fileMap = new Map<string, ImplementationChangedFile>();
  if (branchSourceAvailable) addChangedFiles(fileMap, branch.changedFiles ?? [], branch.reference ?? branch.name ?? "feature-branch");
  for (const item of pullRequests) addChangedFiles(fileMap, item.changedFiles, item.url);
  for (const item of commits) addChangedFiles(fileMap, item.changedFiles, item.sha);
  for (const item of repositoryDiffs) addChangedFiles(fileMap, item.changedFiles, item.reference);

  const memoryLeads = (input.historicalReferences ?? []).filter((item) =>
    item.storyKey === storyKey && item.repository === repository
  );
  const previousContext = input.repositoryContext;
  const fact = (previous: RepositoryContextFact | undefined, references: string[], derivedValue?: boolean): RepositoryContextFact => {
    if (references.length > 0) return { status: "available", value: true, references: unique(references) };
    if (derivedValue !== undefined) return { status: "available", value: derivedValue, references: previous?.references ?? [] };
    return previous ?? { status: "not_checked", value: null, references: [] };
  };
  const branchFact: RepositoryContextFact = {
    status: branch.status,
    value: branch.exists,
    references: branch.reference ? [branch.reference] : []
  };
  const mergeCommitReferences = unique([
    ...pullRequests.flatMap((item) => item.mergeCommitSha ? [item.mergeCommitSha] : []),
    ...mergeCommits.map((item) => item.sha)
  ]);
  const repositoryContext: RepositoryContextModel = {
    branchExists: branchFact,
    pullRequestExists: fact(previousContext?.pullRequestExists, pullRequests.map((item) => item.url)),
    mergeCommitExists: fact(previousContext?.mergeCommitExists, mergeCommitReferences),
    commitHistoryAvailable: fact(previousContext?.commitHistoryAvailable, commits.map((item) => item.sha)),
    reconstructionRequired: fact(previousContext?.reconstructionRequired, [], branch.exists === null ? undefined : !branch.exists)
  };
  const sourceShas = unique([
    ...pullRequests.flatMap((item) => [...item.commitShas, ...(item.mergeCommitSha ? [item.mergeCommitSha] : [])]),
    ...commits.map((item) => item.sha),
    ...repositoryDiffs.flatMap((item) => [item.baseSha, item.headSha])
  ]);

  return {
    schemaVersion: "1.0.0",
    storyKey,
    repository,
    featureBranch: branch,
    repositoryContext,
    reconstructionRequired,
    selectedSource,
    discoveryStatus,
    pullRequests,
    mergeCommits,
    commits,
    repositoryDiffs,
    changedFiles: [...fileMap.values()].sort((left, right) => left.path.localeCompare(right.path)),
    sourceShas,
    memoryLeads,
    ambiguityFindings: unique(ambiguityFindings),
    unrelatedCommitShas: unique(unrelatedCommitShas),
    incorrectBranchMappings: unique(incorrectBranchMappings)
  };
}

export interface ReconstructedFileChange {
  path: string;
  changeType: ImplementationChangeType;
  commitShas: string[];
  areas: ImplementationChangeArea[];
  symbols: string[];
  summary: string;
  confidence: number;
  evidenceReferences: string[];
}

export interface ImplementationReconstructionModel {
  schemaVersion: "1.0.0";
  storyKey: string;
  repository: string;
  sourceKind: ImplementationSourceKind;
  sourceShas: string[];
  status: "complete" | "partial";
  changes: ReconstructedFileChange[];
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  apiChanges: ReconstructedFileChange[];
  uiComponentChanges: ReconstructedFileChange[];
  businessLogicChanges: ReconstructedFileChange[];
  validationChanges: ReconstructedFileChange[];
  dataAccessChanges: ReconstructedFileChange[];
  errorHandlingChanges: ReconstructedFileChange[];
  unresolvedFiles: string[];
}

export interface ImplementationTrustFinding {
  id: string;
  category: "story-pr-mapping" | "story-commit-mapping" | "merge-commit-validity" | "commit-lineage" | "ambiguous-source" | "unrelated-commit" | "branch-mapping" | "trust-score";
  severity: "warning" | "critical";
  description: string;
  evidenceReferences: string[];
}

export interface ImplementationTrustCheck {
  id: string;
  applicable: boolean;
  passed: boolean;
  description: string;
}

export interface ImplementationTrustReport {
  schemaVersion: "1.0.0";
  storyKey: string;
  repository: string;
  score: number;
  decision: "trusted" | "review-required" | "blocked";
  checks: ImplementationTrustCheck[];
  findings: ImplementationTrustFinding[];
}

export function buildImplementationReconstructionModel(
  source: ImplementationSourceModel,
  changes: ReconstructedFileChange[],
  trust: ImplementationTrustReport
): ImplementationReconstructionModel {
  if (source.reconstructionRequired !== true) throw new Error("Implementation reconstruction requires a confirmed missing feature branch.");
  if (source.selectedSource === null || source.discoveryStatus !== "available") throw new Error("Implementation reconstruction requires available source-control evidence.");
  if (trust.storyKey !== source.storyKey || trust.repository !== source.repository || trust.decision !== "trusted") {
    throw new Error("Implementation reconstruction requires a trusted source model for the same story and repository.");
  }

  const sourceFiles = new Map(source.changedFiles.map((item) => [normalizedPath(item.path), item]));
  const seen = new Set<string>();
  const validShas = new Set(source.sourceShas);
  for (const change of changes) {
    const key = normalizedPath(change.path);
    if (!sourceFiles.has(key)) throw new Error(`Reconstructed file ${change.path} is not present in discovered source evidence.`);
    if (seen.has(key)) throw new Error(`Reconstructed file ${change.path} is duplicated.`);
    seen.add(key);
    if (!change.summary.trim() || change.areas.length === 0 || change.evidenceReferences.length === 0) {
      throw new Error(`Reconstructed file ${change.path} requires a summary, change area, and evidence reference.`);
    }
    if (!Number.isFinite(change.confidence) || change.confidence < 0 || change.confidence > 1) {
      throw new Error(`Reconstructed file ${change.path} confidence must be between 0 and 1.`);
    }
    if (change.commitShas.some((sha) => !validShas.has(sha))) throw new Error(`Reconstructed file ${change.path} references a commit outside the source model.`);
  }
  const orderedChanges = [...changes].sort((left, right) => left.path.localeCompare(right.path));
  const paths = (type: ImplementationChangeType): string[] => orderedChanges.filter((item) => item.changeType === type).map((item) => item.path);
  const withArea = (area: ImplementationChangeArea): ReconstructedFileChange[] => orderedChanges.filter((item) => item.areas.includes(area));
  return {
    schemaVersion: "1.0.0",
    storyKey: source.storyKey,
    repository: source.repository,
    sourceKind: source.selectedSource,
    sourceShas: source.sourceShas,
    status: seen.size === sourceFiles.size ? "complete" : "partial",
    changes: orderedChanges,
    addedFiles: paths("added"),
    modifiedFiles: paths("modified"),
    deletedFiles: paths("deleted"),
    apiChanges: withArea("api"),
    uiComponentChanges: withArea("ui-component"),
    businessLogicChanges: withArea("business-logic"),
    validationChanges: withArea("validation"),
    dataAccessChanges: withArea("data-access"),
    errorHandlingChanges: withArea("error-handling"),
    unresolvedFiles: [...sourceFiles.keys()].filter((key) => !seen.has(key)).map((key) => sourceFiles.get(key)!.path).sort()
  };
}