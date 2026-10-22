export type LocatorStrategy =
  | "getByTestId"
  | "getByRole"
  | "getByLabel"
  | "getByPlaceholder"
  | "css"
  | "xpath";

export interface LocatorCandidate {
  strategy: LocatorStrategy;
  value: string;
  unique: boolean;
  stableScope?: string;
  partialText?: boolean;
  localizedText?: boolean;
  dynamicData?: boolean;
  positional?: boolean;
  generatedAttribute?: boolean;
  documentedContract?: boolean;
  justification?: string;
}

export interface LocatorAssessment {
  approved: boolean;
  score: number;
  rating: "excellent" | "strong" | "acceptable" | "weak" | "unreliable" | "prohibited";
  violations: string[];
}

export const locatorPriority: readonly LocatorStrategy[] = [
  "getByTestId",
  "getByRole",
  "getByLabel",
  "getByPlaceholder",
  "css",
  "xpath"
];

const baseScores: Record<LocatorStrategy, number> = {
  getByTestId: 100,
  getByRole: 90,
  getByLabel: 85,
  getByPlaceholder: 70,
  css: 45,
  xpath: 20
};

function rating(score: number): LocatorAssessment["rating"] {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  if (score >= 70) return "acceptable";
  if (score >= 50) return "weak";
  if (score >= 30) return "unreliable";
  return "prohibited";
}

export function assessLocator(candidate: LocatorCandidate): LocatorAssessment {
  const violations: string[] = [];
  let score = baseScores[candidate.strategy];

  if (candidate.unique) score += 5;
  else violations.push("Locator must be unique in its intended scope.");
  if (candidate.stableScope) score += 5;
  if (candidate.documentedContract) score += 5;
  if (candidate.partialText) score -= 10;
  if (candidate.localizedText) score -= 10;
  if (candidate.dynamicData) score -= 10;
  if (candidate.positional) {
    score -= 30;
    violations.push("Arbitrary positional locators are forbidden.");
  }
  if (candidate.generatedAttribute) {
    score -= 40;
    violations.push("Generated or transient attributes are forbidden.");
  }
  if ((candidate.strategy === "css" || candidate.strategy === "xpath") && !candidate.justification?.trim()) {
    violations.push(`${candidate.strategy} requires a documented exception justification.`);
  }
  if (candidate.strategy === "xpath" && candidate.value.startsWith("/")) {
    score -= 50;
    violations.push("Absolute XPath is forbidden.");
  }
  if (candidate.strategy === "css" && /:nth-(child|of-type)/.test(candidate.value)) {
    violations.push("Positional CSS selectors are forbidden.");
  }

  score = Math.max(0, Math.min(100, score));
  return {
    approved: violations.length === 0 && score >= 70,
    score,
    rating: rating(score),
    violations
  };
}
