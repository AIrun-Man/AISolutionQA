export type LocatorStrategy = "getByTestId" | "getByRole" | "getByLabel" | "getByPlaceholder" | "css" | "xpath";

export type LocatorPolicy = {
  strategy: LocatorStrategy;
  score: number;
  approved: boolean;
  reason: string;
};

export function scoreLocator(strategy: LocatorStrategy): LocatorPolicy {
  const baseScores: Record<LocatorStrategy, number> = {
    getByTestId: 100,
    getByRole: 90,
    getByLabel: 85,
    getByPlaceholder: 70,
    css: 45,
    xpath: 20
  };

  return {
    strategy,
    score: baseScores[strategy],
    approved: baseScores[strategy] >= 70,
    reason: "Governed locator strategy selected according to the project standard."
  };
}

export function requireApprovedLocator(strategy: LocatorStrategy): LocatorPolicy {
  const policy = scoreLocator(strategy);
  if (!policy.approved) {
    throw new Error(`${strategy} requires a documented locator-governance exception.`);
  }
  return policy;
}
