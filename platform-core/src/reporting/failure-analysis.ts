import { redactSensitiveText } from "./generator.js";

export type FailureClassification =
  | "product-defect"
  | "framework-defect"
  | "locator-defect"
  | "environment-issue"
  | "test-data-issue"
  | "infrastructure-issue"
  | "undetermined";

export interface FailureEvidence {
  testId: string;
  error?: string;
  logs?: string[];
  observations?: string[];
  artifacts?: string[];
}

export interface FailureRootCause {
  testId: string;
  classification: FailureClassification;
  confidence: number;
  rationale: string;
  evidence: string[];
  artifactReferences: string[];
  requiresHumanReview: boolean;
}

const classificationRules: Array<{
  classification: FailureClassification;
  pattern: RegExp;
  rationale: string;
}> = [
  {
    classification: "infrastructure-issue",
    pattern: /\b(?:runner (?:unavailable|lost|failure)|artifact upload (?:failed|timed out)|quota exceeded|no space left on device|infrastructure (?:failure|unavailable)|worker lost|hosted runner image unavailable)\b/i,
    rationale: "Evidence points to a CI runner, shared infrastructure, artifact service, or resource-capacity failure."
  },
  {
    classification: "environment-issue",
    pattern: /\b(?:ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|DNS|network unavailable|browser executable|connection refused|502|503|service unavailable)\b/i,
    rationale: "Evidence contains a network, service, or runtime availability signature."
  },
  {
    classification: "locator-defect",
    pattern: /\b(?:locator|selector|strict mode violation|element not found|no element matches|waiting for.*selector)\b/i,
    rationale: "Evidence points to a missing, ambiguous, or unusable UI locator."
  },
  {
    classification: "test-data-issue",
    pattern: /\b(?:fixture|seed data|test data|missing test user|record not found|invalid test data|data setup)\b/i,
    rationale: "Evidence points to missing, invalid, or incorrectly prepared test data."
  },
  {
    classification: "framework-defect",
    pattern: /\b(?:TypeError|SyntaxError|ReferenceError|test code|fixture setup failed|assertion helper|cannot read propert)\b/i,
    rationale: "Evidence points to an error in test code, fixtures, or automation support."
  },
  {
    classification: "product-defect",
    pattern: /\b(?:confirmed product defect|acceptance criterion [A-Z][A-Z0-9]+-[1-9][0-9]* is violated|application (?:returned|displayed|persisted|calculated) (?:an? )?(?:incorrect|unexpected|invalid) (?:value|result|state)|reproduced business outcome mismatch)\b/i,
    rationale: "Evidence explicitly records a reproduced application behavior that violates an acceptance criterion or business outcome."
  }
];

export function analyzeFailure(evidence: FailureEvidence): FailureRootCause {
  const rawEvidence = [evidence.error, ...(evidence.logs ?? []), ...(evidence.observations ?? [])]
    .filter((value): value is string => Boolean(value));
  const sanitizedEvidence = rawEvidence.map(redactSensitiveText);
  const artifactReferences = (evidence.artifacts ?? []).map(redactSensitiveText);
  const combined = sanitizedEvidence.join("\n");

  for (const rule of classificationRules) {
    const matched = sanitizedEvidence.filter((line) => rule.pattern.test(line));
    if (matched.length > 0) {
      return {
        testId: evidence.testId,
        classification: rule.classification,
        confidence: 0.85,
        rationale: rule.rationale,
        evidence: matched,
        artifactReferences,
        requiresHumanReview: true
      };
    }
  }

  if (/\b(?:expected|assertion|to equal|to be visible|actual)\b/i.test(combined)) {
    return {
      testId: evidence.testId,
      classification: "undetermined",
      confidence: 0.35,
      rationale: "An assertion mismatch is present, but the available evidence does not confirm whether the cause is product behavior or test expectations.",
      evidence: sanitizedEvidence,
      artifactReferences,
      requiresHumanReview: true
    };
  }

  return {
    testId: evidence.testId,
    classification: "undetermined",
    confidence: 0,
    rationale: "Available text evidence does not support a reliable root-cause classification.",
    evidence: sanitizedEvidence,
    artifactReferences,
    requiresHumanReview: true
  };
}