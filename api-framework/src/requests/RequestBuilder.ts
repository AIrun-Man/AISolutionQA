import type { EndpointDefinition } from "../endpoints/definitions.js";

export interface RequestOptions {
  pathParams?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
}

export function buildRequest(endpoint: EndpointDefinition, options: RequestOptions = {}) {
  const requiredParams = [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  const missingParams = requiredParams.filter((key) => options.pathParams?.[key] === undefined);
  if (missingParams.length > 0) {
    throw new Error(`Endpoint ${endpoint.id} is missing path parameters: ${missingParams.join(", ")}`);
  }
  const path = endpoint.path.replace(/\{(\w+)\}/g, (_, key: string) =>
    encodeURIComponent(String(options.pathParams?.[key]))
  );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) query.set(key, String(value));
  }
  const url = query.size > 0 ? `${path}?${query.toString()}` : path;

  return {
    method: endpoint.method,
    url,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body
  };
}
