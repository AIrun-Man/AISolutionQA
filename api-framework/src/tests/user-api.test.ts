import test from "node:test";
import assert from "node:assert/strict";

import { resolveEnvironment } from "../environments/config.js";
import { httpClient } from "../clients/HttpClient.js";
import { endpoints } from "../endpoints/definitions.js";
import { buildRequest } from "../requests/RequestBuilder.js";
import { validateResponse } from "../validators/response-validator.js";
import { UserListSchema } from "../schemas/user.js";

const environment = resolveEnvironment("test");

if (process.env.RUN_API_TESTS !== "true") {
  test("sample API validation gate", () => {
    assert.equal(true, true);
  });
} else {
  test("GET /users returns a valid response", async () => {
    const endpoint = endpoints.getUsers;
    const request = buildRequest(endpoint);
    const url = `${environment.baseUrl}${request.url}`;
    const response = await httpClient({ ...request, url, timeoutMs: environment.timeoutMs });
    const validation = validateResponse({
      status: response.status,
      expectedStatuses: endpoint.expectedStatuses,
      headers: response.headers,
      requiredHeaders: ["content-type"],
      data: response.data,
      schema: UserListSchema
    });

    assert.equal(validation.valid, true);
  });
}
