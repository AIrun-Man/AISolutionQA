import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { endpoints, getEndpoint } from "../endpoints/definitions.js";
import { buildRequest } from "../requests/RequestBuilder.js";
import { writeApiReport } from "../reporting/ApiReport.js";
import { UserSchema } from "../schemas/user.js";
import { validateResponse } from "../validators/response-validator.js";
import { resolveEnvironment } from "../environments/config.js";

test("resolves named enterprise API environments without breaking legacy aliases", () => {
  const previousUrl = process.env.DEV_API_BASE_URL;
  process.env.DEV_API_BASE_URL = "https://dev-api.example.test";
  try {
    assert.deepEqual(resolveEnvironment("DEV"), {
      name: "dev",
      baseUrl: "https://dev-api.example.test",
      timeoutMs: 15000,
      baseUrlVariable: "DEV_API_BASE_URL"
    });
    assert.equal(resolveEnvironment("test").name, "test");
  } finally {
    if (previousUrl === undefined) delete process.env.DEV_API_BASE_URL;
    else process.env.DEV_API_BASE_URL = previousUrl;
  }
  assert.throws(() => resolveEnvironment("PREPROD"), /PREPROD_API_BASE_URL must be set/);
});

test("builds encoded paths and query parameters", () => {
  const request = buildRequest(endpoints.getUserById, {
    pathParams: { id: "user/1" },
    query: { include: "profile", disabled: false }
  });
  assert.equal(request.url, "/users/user%2F1?include=profile&disabled=false");
});

test("rejects missing path parameters", () => {
  assert.throws(() => buildRequest(endpoints.getUserById), /missing path parameters/);
});

test("rejects unknown endpoint identifiers", () => {
  assert.throws(() => getEndpoint("missing"), /Unknown endpoint/);
});

test("validates status, headers, and schema", () => {
  const validation = validateResponse({
    status: 200,
    expectedStatuses: [200],
    headers: { "content-type": "application/json" },
    requiredHeaders: ["Content-Type"],
    data: { id: 1, name: "User", email: "user@example.com" },
    schema: UserSchema
  });
  assert.deepEqual(validation, { valid: true, status: 200, errors: [] });
});

test("writes API JSON and escaped HTML reports", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "qe-api-report-"));
  try {
    await writeApiReport([{
      testId: "TC-<1>",
      operationId: "getUser",
      method: "GET",
      sanitizedUrl: "/users/1",
      status: 200,
      durationMs: 10,
      outcome: "passed",
      validationErrors: []
    }], outputDirectory);
    const json = await readFile(join(outputDirectory, "results.json"), "utf8");
    const html = await readFile(join(outputDirectory, "index.html"), "utf8");
    assert.equal(JSON.parse(json).passed, 1);
    assert.equal(html.includes("TC-&lt;1&gt;"), true);
  } finally {
    await rm(outputDirectory, { recursive: true });
  }
});
