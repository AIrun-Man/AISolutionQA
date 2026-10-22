export type ApiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type ApiContractSourceType = "openapi" | "swagger" | "redoc" | "oneapi" | "api-framework";
export type ApiAuthenticationScheme = "none" | "bearer" | "api-key" | "basic" | "oauth2" | "other";

export interface ApiSchemaContract {
  name: string;
  mediaType?: string;
  type?: string;
  requiredFields: string[];
  properties: Record<string, string>;
}

export interface ApiParameterContract {
  name: string;
  location: "path" | "query" | "header" | "cookie";
  required: boolean;
  type?: string;
  description?: string;
  constraints: Record<string, string | number | boolean>;
}

export interface ApiResponseContract {
  status: number;
  description: string;
  schema?: ApiSchemaContract;
  headers: string[];
}

export interface ApiContractOperation {
  operationId: string;
  method: ApiHttpMethod;
  path: string;
  summary: string;
  description: string;
  sourceUrl: string;
  sourceType: ApiContractSourceType;
  tags: string[];
  authentication: ApiAuthenticationScheme;
  securityScopes: string[];
  headers: ApiParameterContract[];
  queryParameters: ApiParameterContract[];
  pathParameters: ApiParameterContract[];
  requestSchema?: ApiSchemaContract;
  responseSchemas: Record<number, ApiSchemaContract>;
  responseHeaders: Record<number, string[]>;
  expectedStatuses: number[];
  errorResponses: ApiResponseContract[];
}

export interface ApiPortalDiscoverySource {
  portalName: string;
  portalUrl: string;
  sourceType: ApiContractSourceType;
  operations: ApiContractOperation[];
}

export interface ApiDiscoveryResult {
  portals: Array<{ name: string; url: string; operationCount: number }>;
  operations: ApiContractOperation[];
  duplicateOperationIds: string[];
  errors: string[];
}

export interface ApiFrameworkEndpointLike {
  id: string;
  method: string;
  path: string;
  description: string;
  authentication: string;
  expectedStatuses: readonly number[];
  tags?: readonly string[];
  requiredHeaders?: readonly string[];
  queryParameters?: ReadonlyArray<{ name: string; schema: string; required: boolean; description?: string }>;
  requestBodySchema?: string;
  responseSchemas?: Readonly<Record<number, string>>;
  errorResponses?: ReadonlyArray<{ status: number; schema?: string; description: string; headers?: readonly string[] }>;
  securityScopes?: readonly string[];
}

type JsonRecord = Record<string, unknown>;
const HTTP_METHODS = new Set<ApiHttpMethod>(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const PARAMETER_LOCATIONS = new Set<ApiParameterContract["location"]>(["path", "query", "header", "cookie"]);

function asRecord(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function schemaName(schema: unknown): string {
  const record = asRecord(schema);
  const reference = asString(record?.$ref);
  if (reference) return reference.split("/").at(-1) ?? reference;
  return asString(record?.title, asString(record?.type, "UnspecifiedSchema"));
}

function normalizeSchema(schema: unknown, mediaType?: string): ApiSchemaContract | undefined {
  const record = asRecord(schema);
  if (!record) return undefined;
  const propertiesRecord = asRecord(record.properties) ?? {};
  const requiredFields = Array.isArray(record.required)
    ? record.required.filter((field): field is string => typeof field === "string")
    : [];
  const properties = Object.fromEntries(Object.entries(propertiesRecord).map(([name, value]) => [name, schemaName(value)]));
  return {
    name: schemaName(schema),
    ...(mediaType ? { mediaType } : {}),
    ...(typeof record.type === "string" ? { type: record.type } : {}),
    requiredFields,
    properties
  };
}

function parameterConstraints(schema: unknown): Record<string, string | number | boolean> {
  const record = asRecord(schema) ?? {};
  const keys = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "pattern", "format", "enum", "minItems", "maxItems"];
  return Object.fromEntries(keys.flatMap((key) => {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [[key, value]];
    if (Array.isArray(value)) return [[key, value.map(String).join(",")]];
    return [];
  }));
}

function normalizeParameters(parameters: unknown): ApiParameterContract[] {
  if (!Array.isArray(parameters)) return [];
  return parameters.flatMap((parameter) => {
    const record = asRecord(parameter);
    if (!record || typeof record.name !== "string" || typeof record.in !== "string" || !PARAMETER_LOCATIONS.has(record.in as ApiParameterContract["location"])) return [];
    const schema = asRecord(record.schema);
    return [{
      name: record.name,
      location: record.in as ApiParameterContract["location"],
      required: record.required === true || record.in === "path",
      ...(typeof schema?.type === "string" ? { type: schema.type } : {}),
      ...(typeof record.description === "string" ? { description: record.description } : {}),
      constraints: parameterConstraints(schema)
    }];
  });
}

function securityDetails(operation: JsonRecord, document: JsonRecord): { scheme: ApiAuthenticationScheme; scopes: string[] } {
  const security = Array.isArray(operation.security) ? operation.security : Array.isArray(document.security) ? document.security : [];
  const securityNames = security.flatMap((entry) => Object.keys(asRecord(entry) ?? {}));
  if (securityNames.length === 0) return { scheme: "none", scopes: [] };
  const componentsSchemes = asRecord(asRecord(asRecord(document.components)?.securitySchemes)?.[securityNames[0] ?? ""]);
  const swaggerSchemes = asRecord(asRecord(document.securityDefinitions)?.[securityNames[0] ?? ""]);
  const schemes = componentsSchemes ?? swaggerSchemes;
  const type = asString(schemes?.type).toLowerCase();
  const scheme = asString(schemes?.scheme).toLowerCase();
  const authentication: ApiAuthenticationScheme = type === "http" && scheme === "bearer"
    ? "bearer"
    : type === "http" && scheme === "basic"
      ? "basic"
      : type === "apikey"
        ? "api-key"
        : type === "oauth2" || type === "openIdConnect"
          ? "oauth2"
          : "other";
  const scopes = security.flatMap((entry) => Object.values(asRecord(entry) ?? {}).flatMap((value) => Array.isArray(value) ? value.filter((scope): scope is string => typeof scope === "string") : []));
  return { scheme: authentication, scopes: [...new Set(scopes)] };
}

function normalizeOperation(
  operationId: string,
  method: ApiHttpMethod,
  path: string,
  operation: JsonRecord,
  document: JsonRecord,
  sourceUrl: string,
  sourceType: ApiContractSourceType,
  sharedParameters: unknown
): ApiContractOperation {
  const parameters = normalizeParameters([
    ...(Array.isArray(sharedParameters) ? sharedParameters : []),
    ...(Array.isArray(operation.parameters) ? operation.parameters : [])
  ]);
  const requestBody = asRecord(operation.requestBody);
  const requestContent = asRecord(requestBody?.content) ?? {};
  const requestMediaType = Object.keys(requestContent).find((mediaType) => mediaType.includes("json"));
  const requestMedia = asRecord(requestContent[requestMediaType ?? ""]);
  const rawBodyParameter = [
    ...(Array.isArray(sharedParameters) ? sharedParameters : []),
    ...(Array.isArray(operation.parameters) ? operation.parameters : [])
  ].map(asRecord).find((parameter) => parameter?.in === "body");
  const operationConsumes = Array.isArray(operation.consumes) ? asString(operation.consumes[0]) : "";
  const documentConsumes = Array.isArray(document.consumes) ? asString(document.consumes[0]) : "";
  const requestSchema = normalizeSchema(requestMedia?.schema ?? rawBodyParameter?.schema, requestMediaType ?? (operationConsumes || documentConsumes));
  const responseSchemas: Record<number, ApiSchemaContract> = {};
  const responseHeaders: Record<number, string[]> = {};
  const errorResponses: ApiResponseContract[] = [];
  const expectedStatuses: number[] = [];

  for (const [statusLabel, responseValue] of Object.entries(asRecord(operation.responses) ?? {})) {
    const response = asRecord(responseValue);
    const status = Number(statusLabel);
    if (!Number.isInteger(status) || status < 100 || status > 599) continue;
    const description = asString(response?.description, `HTTP ${status}`);
    const headers = Object.keys(asRecord(response?.headers) ?? {});
    const content = asRecord(response?.content) ?? {};
    const mediaType = Object.keys(content).find((type) => type.includes("json"));
    const media = asRecord(content[mediaType ?? ""]);
    const operationProduces = Array.isArray(operation.produces) ? asString(operation.produces[0]) : "";
    const documentProduces = Array.isArray(document.produces) ? asString(document.produces[0]) : "";
    const schema = normalizeSchema(media?.schema ?? response?.schema, mediaType ?? (operationProduces || documentProduces));
    expectedStatuses.push(status);
    responseHeaders[status] = headers;
    if (schema) responseSchemas[status] = schema;
    if (status >= 400) errorResponses.push({ status, description, ...(schema ? { schema } : {}), headers });
  }

  const auth = securityDetails(operation, document);
  const operationTags = Array.isArray(operation.tags) ? operation.tags.filter((tag): tag is string => typeof tag === "string") : [];
  return {
    operationId,
    method,
    path,
    summary: asString(operation.summary, operationId),
    description: asString(operation.description),
    sourceUrl,
    sourceType,
    tags: operationTags,
    authentication: auth.scheme,
    securityScopes: auth.scopes,
    headers: parameters.filter((parameter) => parameter.location === "header"),
    queryParameters: parameters.filter((parameter) => parameter.location === "query"),
    pathParameters: parameters.filter((parameter) => parameter.location === "path"),
    ...(requestSchema ? { requestSchema } : {}),
    responseSchemas,
    responseHeaders,
    expectedStatuses: [...new Set(expectedStatuses)].sort((left, right) => left - right),
    errorResponses
  };
}

export function normalizeOpenApiDocument(
  document: unknown,
  sourceUrl: string,
  sourceType: Extract<ApiContractSourceType, "openapi" | "swagger">
): ApiContractOperation[] {
  const root = asRecord(document);
  if (!root) throw new Error("API contract document must be a JSON object.");
  if (!sourceUrl.trim()) throw new Error("API contract source URL is required.");
  const paths = asRecord(root.paths);
  if (!paths) throw new Error("API contract document has no paths object.");
  const operations: ApiContractOperation[] = [];
  for (const [path, pathValue] of Object.entries(paths)) {
    const pathItem = asRecord(pathValue);
    if (!pathItem) continue;
    const sharedParameters = pathItem.parameters;
    for (const [methodLabel, operationValue] of Object.entries(pathItem)) {
      const method = methodLabel.toUpperCase() as ApiHttpMethod;
      if (!HTTP_METHODS.has(method)) continue;
      const operation = asRecord(operationValue);
      if (!operation) continue;
      const fallbackId = `${method.toLowerCase()}_${path.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
      const operationId = asString(operation.operationId, fallbackId);
      operations.push(normalizeOperation(operationId, method, path, operation, root, sourceUrl, sourceType, sharedParameters));
    }
  }
  return operations;
}

export function apiContractsFromEndpointDefinitions(
  definitions: Readonly<Record<string, ApiFrameworkEndpointLike>>,
  sourceUrl: string
): ApiContractOperation[] {
  return Object.values(definitions).map((endpoint) => {
    const method = endpoint.method.toUpperCase() as ApiHttpMethod;
    if (!HTTP_METHODS.has(method)) throw new Error(`Unsupported API method ${endpoint.method} for ${endpoint.id}.`);
    const responseSchemas: Record<number, ApiSchemaContract> = Object.fromEntries(
      Object.entries(endpoint.responseSchemas ?? {}).map(([status, name]) => [Number(status), {
        name,
        requiredFields: [],
        properties: {}
      }])
    );
    const auth = endpoint.authentication as ApiAuthenticationScheme;
    if (!["none", "bearer", "api-key", "basic", "oauth2", "other"].includes(auth)) {
      throw new Error(`Unsupported authentication scheme ${endpoint.authentication} for ${endpoint.id}.`);
    }
    return {
      operationId: endpoint.id,
      method,
      path: endpoint.path,
      summary: endpoint.description,
      description: endpoint.description,
      sourceUrl,
      sourceType: "api-framework" as const,
      tags: [...(endpoint.tags ?? [])],
      authentication: auth,
      securityScopes: [...(endpoint.securityScopes ?? [])],
      headers: (endpoint.requiredHeaders ?? []).map((name) => ({ name, location: "header" as const, required: true, constraints: {} })),
      queryParameters: (endpoint.queryParameters ?? []).map((parameter) => ({
        name: parameter.name,
        location: "query" as const,
        required: parameter.required,
        type: parameter.schema,
        ...(parameter.description ? { description: parameter.description } : {}),
        constraints: {}
      })),
      pathParameters: [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((match) => ({
        name: match[1] ?? "",
        location: "path" as const,
        required: true,
        type: "string",
        constraints: {}
      })),
      ...(endpoint.requestBodySchema ? { requestSchema: { name: endpoint.requestBodySchema, requiredFields: [], properties: {} } } : {}),
      responseSchemas,
      responseHeaders: Object.fromEntries(endpoint.expectedStatuses.map((status) => [status, [...(endpoint.requiredHeaders ?? [])]])),
      expectedStatuses: [...endpoint.expectedStatuses],
      errorResponses: (endpoint.errorResponses ?? []).map((response) => ({
        status: response.status,
        description: response.description,
        ...(response.schema ? { schema: { name: response.schema, requiredFields: [], properties: {} } } : {}),
        headers: [...(response.headers ?? [])]
      }))
    };
  });
}

export function discoverApiContracts(sources: ApiPortalDiscoverySource[]): ApiDiscoveryResult {
  const errors: string[] = [];
  const operationIds = new Set<string>();
  const signatures = new Set<string>();
  const duplicateOperationIds = new Set<string>();
  const operations: ApiContractOperation[] = [];

  for (const source of sources) {
    try {
      const parsedUrl = new URL(source.portalUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) errors.push(`Portal URL must use HTTP or HTTPS: ${source.portalUrl}`);
    } catch {
      errors.push(`Invalid API portal URL: ${source.portalUrl}`);
    }
    for (const operation of source.operations) {
      if (!operation.operationId.trim() || !operation.path.startsWith("/")) {
        errors.push(`Portal ${source.portalName} has an API operation without a stable ID or absolute path.`);
        continue;
      }
      const signature = `${operation.method} ${operation.path}`;
      if (operationIds.has(operation.operationId) || signatures.has(signature)) {
        duplicateOperationIds.add(operation.operationId);
        continue;
      }
      operationIds.add(operation.operationId);
      signatures.add(signature);
      operations.push({ ...operation, sourceUrl: source.portalUrl, sourceType: source.sourceType });
    }
  }

  return {
    portals: sources.map((source) => ({ name: source.portalName, url: source.portalUrl, operationCount: source.operations.length })),
    operations,
    duplicateOperationIds: [...duplicateOperationIds].sort(),
    errors
  };
}
