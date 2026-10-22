export type ApiParameterDefinition = {
  name: string;
  schema: string;
  required: boolean;
  description?: string;
};

export type ApiResponseDefinition = {
  status: number;
  schema?: string;
  description: string;
  headers?: readonly string[];
};

export type EndpointDefinition = {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  authentication: "none" | "bearer" | "api-key";
  expectedStatuses: readonly number[];
  tags?: readonly string[];
  requiredHeaders?: readonly string[];
  queryParameters?: readonly ApiParameterDefinition[];
  requestBodySchema?: string;
  responseSchemas?: Readonly<Record<number, string>>;
  errorResponses?: readonly ApiResponseDefinition[];
  securityScopes?: readonly string[];
};

export const endpoints: Record<string, EndpointDefinition> = {
  getUsers: {
    id: "getUsers",
    method: "GET",
    path: "/users",
    description: "Retrieve all users",
    authentication: "none",
    expectedStatuses: [200],
    tags: ["users"],
    responseSchemas: { 200: "UserListSchema" },
    errorResponses: [
      { status: 401, description: "Authentication required" },
      { status: 500, description: "Unexpected server error" }
    ]
  },
  getUserById: {
    id: "getUserById",
    method: "GET",
    path: "/users/{id}",
    description: "Retrieve a user by id",
    authentication: "none",
    expectedStatuses: [200, 404],
    tags: ["users"],
    queryParameters: [],
    responseSchemas: { 200: "UserSchema" },
    errorResponses: [
      { status: 404, schema: "ApiErrorSchema", description: "User not found" },
      { status: 500, schema: "ApiErrorSchema", description: "Unexpected server error" }
    ]
  }
};

export function getEndpoint(id: string): EndpointDefinition {
  const endpoint = endpoints[id];
  if (!endpoint) {
    throw new Error(`Unknown endpoint definition: ${id}`);
  }
  return endpoint;
}
