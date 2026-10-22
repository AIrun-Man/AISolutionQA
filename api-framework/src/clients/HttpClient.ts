export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestSpec = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type ResponseSpec<T = unknown> = {
  status: number;
  headers: Record<string, string>;
  data: T;
  durationMs: number;
};

export async function httpClient<T = unknown>(request: RequestSpec): Promise<ResponseSpec<T>> {
  const controller = new AbortController();
  const timeoutMs = request.timeoutMs ?? 30_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers ?? {},
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: controller.signal
    });
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    let data: unknown = null;
    if (text) {
      if (contentType.includes("json")) {
        try {
          data = JSON.parse(text);
        } catch (error) {
          throw new Error(`Response from ${request.method} ${request.url} declared JSON but was invalid.`, {
            cause: error
          });
        }
      } else {
        data = text;
      }
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: data as T,
      durationMs: Math.round(performance.now() - startedAt)
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request ${request.method} ${request.url} timed out after ${timeoutMs}ms.`, { cause: error });
    }
    throw new Error(`Request ${request.method} ${request.url} failed.`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}
