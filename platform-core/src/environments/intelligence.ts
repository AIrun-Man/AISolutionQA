export const supportedEnvironmentNames = ["DEV", "QA", "INT", "SIT", "UAT", "PREPROD", "PROD"] as const;
export type SupportedEnvironmentName = typeof supportedEnvironmentNames[number];
export type EnvironmentAuthenticationPattern = "none" | "basic" | "bearer" | "oauth2" | "cookie" | "sso" | "client-certificate" | "unknown";

export interface EnvironmentVariableInput {
  name: string;
  required: boolean;
  secret: boolean;
  configured: boolean;
}

export interface EnvironmentIntelligenceInput {
  name: SupportedEnvironmentName;
  acceptanceCriteriaIds?: string[];
  baseUrl: string;
  apiBaseUrl?: string;
  authenticationPatterns: EnvironmentAuthenticationPattern[];
  environmentVariables: EnvironmentVariableInput[];
  apiEndpoints: string[];
  featureToggles: Record<string, boolean>;
  configuration: Record<string, string | number | boolean | null>;
}

export interface EnvironmentConfigurationDifference {
  key: string;
  differs: boolean;
  environments: Array<{ name: SupportedEnvironmentName; configured: boolean; redacted: boolean }>;
}

export interface EnvironmentModelEntry extends Omit<EnvironmentIntelligenceInput, "configuration"> {
  configuration: Array<{ key: string; configured: boolean; redacted: boolean }>;
}

export interface EnvironmentIntelligenceModel {
  schemaVersion: "1.0.0";
  environments: EnvironmentModelEntry[];
  missingEnvironments: SupportedEnvironmentName[];
  configurationDifferences: EnvironmentConfigurationDifference[];
}

const sensitiveNamePattern = /password|secret|token|credential|private.?key|client.?secret|api.?key/i;

function validUrl(value: string, label: string, environment: SupportedEnvironmentName): void {
  try {
    const url = new URL(value);
    if (!(["http:", "https:"].includes(url.protocol))) throw new Error("unsupported protocol");
  } catch {
    throw new Error(`${label} must be an absolute HTTP(S) URL for ${environment}.`);
  }
}

export function buildEnvironmentIntelligence(inputs: EnvironmentIntelligenceInput[]): EnvironmentIntelligenceModel {
  const names = new Set<SupportedEnvironmentName>();
  for (const input of inputs) {
    if (!supportedEnvironmentNames.includes(input.name)) throw new Error(`Unsupported execution environment: ${input.name}.`);
    if (names.has(input.name)) throw new Error(`Duplicate execution environment: ${input.name}.`);
    names.add(input.name);
    validUrl(input.baseUrl, "Base URL", input.name);
    if (input.apiBaseUrl) validUrl(input.apiBaseUrl, "API base URL", input.name);
    const variableNames = new Set<string>();
    for (const variable of input.environmentVariables) {
      if (!variable.name.trim()) throw new Error(`Environment variable names must not be empty for ${input.name}.`);
      if (variableNames.has(variable.name)) throw new Error(`Duplicate environment variable ${variable.name} for ${input.name}.`);
      variableNames.add(variable.name);
    }
  }

  const sortedInputs = [...inputs].sort((left, right) => supportedEnvironmentNames.indexOf(left.name) - supportedEnvironmentNames.indexOf(right.name));
  const configurationKeys = [...new Set([
    ...sortedInputs.flatMap((input) => Object.keys(input.configuration)),
    ...sortedInputs.flatMap((input) => Object.keys(input.featureToggles).map((name) => `featureToggle:${name}`))
  ])].sort();
  const configurationDifferences = configurationKeys.map((key): EnvironmentConfigurationDifference => {
    const featureToggleName = key.startsWith("featureToggle:") ? key.slice("featureToggle:".length) : undefined;
    const values = sortedInputs.map((input) => featureToggleName
      ? input.featureToggles[featureToggleName]
      : input.configuration[key]);
    const comparable = values.map((value) => value === undefined ? "<unset>" : String(value));
    return {
      key,
      differs: new Set(comparable).size > 1,
      environments: sortedInputs.map((input) => ({
        name: input.name,
        configured: featureToggleName
          ? Object.hasOwn(input.featureToggles, featureToggleName)
          : Object.hasOwn(input.configuration, key),
        redacted: sensitiveNamePattern.test(key)
      }))
    };
  });

  return {
    schemaVersion: "1.0.0",
    environments: sortedInputs.map((input): EnvironmentModelEntry => ({
      name: input.name,
      ...(input.acceptanceCriteriaIds ? { acceptanceCriteriaIds: [...input.acceptanceCriteriaIds] } : {}),
      baseUrl: input.baseUrl,
      ...(input.apiBaseUrl ? { apiBaseUrl: input.apiBaseUrl } : {}),
      authenticationPatterns: [...new Set(input.authenticationPatterns)],
      environmentVariables: input.environmentVariables.map(({ name, required, secret, configured }) => ({
        name,
        required,
        secret: secret || sensitiveNamePattern.test(name),
        configured
      })),
      apiEndpoints: [...new Set(input.apiEndpoints)].sort(),
      featureToggles: { ...input.featureToggles },
      configuration: Object.keys(input.configuration).sort().map((key) => ({
        key,
        configured: true,
        redacted: sensitiveNamePattern.test(key)
      }))
    })),
    missingEnvironments: supportedEnvironmentNames.filter((name) => !names.has(name)),
    configurationDifferences
  };
}