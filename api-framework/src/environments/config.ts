export type EnvironmentName = "local" | "test" | "staging" | "production" | "dev" | "qa" | "int" | "sit" | "uat" | "preprod" | "prod";

export type EnvironmentConfig = {
  name: EnvironmentName;
  baseUrl: string;
  timeoutMs: number;
  baseUrlVariable?: string;
};

export const environmentConfig: Record<EnvironmentName, EnvironmentConfig> = {
  local: { name: "local", baseUrl: "http://localhost:3000", timeoutMs: 15000 },
  test: { name: "test", baseUrl: process.env.API_BASE_URL || "https://jsonplaceholder.typicode.com", timeoutMs: 20000 },
  staging: { name: "staging", baseUrl: process.env.STAGING_API_BASE_URL || "https://staging.example.com", timeoutMs: 25000 },
  production: { name: "production", baseUrl: process.env.PRODUCTION_API_BASE_URL || "https://api.example.com", timeoutMs: 30000 },
  dev: { name: "dev", baseUrl: "", baseUrlVariable: "DEV_API_BASE_URL", timeoutMs: 15000 },
  qa: { name: "qa", baseUrl: "", baseUrlVariable: "QA_API_BASE_URL", timeoutMs: 20000 },
  int: { name: "int", baseUrl: "", baseUrlVariable: "INT_API_BASE_URL", timeoutMs: 20000 },
  sit: { name: "sit", baseUrl: "", baseUrlVariable: "SIT_API_BASE_URL", timeoutMs: 20000 },
  uat: { name: "uat", baseUrl: "", baseUrlVariable: "UAT_API_BASE_URL", timeoutMs: 25000 },
  preprod: { name: "preprod", baseUrl: "", baseUrlVariable: "PREPROD_API_BASE_URL", timeoutMs: 30000 },
  prod: { name: "prod", baseUrl: "", baseUrlVariable: "PROD_API_BASE_URL", timeoutMs: 30000 }
};

export function resolveEnvironment(name: string): EnvironmentConfig {
  const environmentName = name.trim().toLowerCase() as EnvironmentName;
  if (!(environmentName in environmentConfig)) {
    throw new Error(`Unknown API environment: ${name}`);
  }
  const config = environmentConfig[environmentName];
  const baseUrl = config.baseUrl || (config.baseUrlVariable ? process.env[config.baseUrlVariable] : undefined);
  if (!baseUrl) throw new Error(`Environment variable ${config.baseUrlVariable} must be set for ${environmentName.toUpperCase()}.`);
  new URL(baseUrl);
  return Object.freeze({ ...config, baseUrl });
}
