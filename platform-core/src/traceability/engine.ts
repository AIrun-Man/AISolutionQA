export type TraceEntityType = "story" | "requirement" | "test-case" | "automation" | "execution" | "report" | "defect";
export type TraceRelationship = "contains-test-case" | "verified-by" | "automated-by" | "executed-as" | "reported-in" | "detected-defect";

export interface TraceEntity {
  id: string;
  type: TraceEntityType;
  version: number;
  status: "active" | "deprecated";
}

export interface TraceLink {
  id: string;
  relationship: TraceRelationship;
  sourceId: string;
  sourceVersion: number;
  targetId: string;
  targetVersion: number;
  status: "active" | "suspect" | "invalid" | "deprecated";
}

export interface TraceabilityValidation {
  valid: boolean;
  orphanEntityIds: string[];
  invalidLinkIds: string[];
  brokenChainIds: string[];
}

const expectedTypes: Record<TraceRelationship, [TraceEntityType, TraceEntityType]> = {
  "contains-test-case": ["story", "test-case"],
  "verified-by": ["requirement", "test-case"],
  "automated-by": ["test-case", "automation"],
  "executed-as": ["automation", "execution"],
  "reported-in": ["execution", "report"],
  "detected-defect": ["execution", "defect"]
};

export function validateTraceability(entities: TraceEntity[], links: TraceLink[]): TraceabilityValidation {
  const entityMap = new Map(entities.map((entity) => [`${entity.id}@${entity.version}`, entity]));
  const invalidLinkIds: string[] = [];
  const linkedIds = new Set<string>();

  for (const link of links) {
    const source = entityMap.get(`${link.sourceId}@${link.sourceVersion}`);
    const target = entityMap.get(`${link.targetId}@${link.targetVersion}`);
    const [sourceType, targetType] = expectedTypes[link.relationship];
    if (!source || !target || source.type !== sourceType || target.type !== targetType) {
      invalidLinkIds.push(link.id);
      continue;
    }
    linkedIds.add(source.id);
    linkedIds.add(target.id);
  }

  const activeEntities = entities.filter((entity) => entity.status === "active");
  const orphanEntityIds = activeEntities.filter((entity) => !linkedIds.has(entity.id)).map((entity) => entity.id);
  const activeLinks = links.filter((link) => link.status === "active" && !invalidLinkIds.includes(link.id));
  const outboundRelationship: Record<TraceEntityType, TraceRelationship | undefined> = {
    story: "contains-test-case",
    requirement: "verified-by",
    "test-case": "automated-by",
    automation: "executed-as",
    execution: "reported-in",
    report: undefined,
    defect: undefined
  };
  const brokenChainIds = activeEntities
    .filter((entity) => {
      const relationship = outboundRelationship[entity.type];
      return relationship
        ? !activeLinks.some((link) => link.sourceId === entity.id && link.relationship === relationship)
        : false;
    })
    .map((entity) => entity.id);

  return {
    valid: orphanEntityIds.length === 0 && invalidLinkIds.length === 0 && brokenChainIds.length === 0,
    orphanEntityIds,
    invalidLinkIds,
    brokenChainIds
  };
}
