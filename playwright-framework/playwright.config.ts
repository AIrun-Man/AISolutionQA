import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
import { resolveJiraGenerationPaths, validateGenerationConfig, type GenerationConfig } from "@platform/core";
import { resolveEnvironment } from "./src/config/environment.js";

const generationConfigPath = process.env.GENERATION_CONFIG_PATH
  ? resolve(process.env.GENERATION_CONFIG_PATH)
  : fileURLToPath(new URL("../generation-config.json", import.meta.url));
const generationConfigValue: unknown = JSON.parse(readFileSync(generationConfigPath, "utf8"));
const generationConfigErrors = validateGenerationConfig(generationConfigValue);
if (generationConfigErrors.length > 0) {
  throw new Error(`Invalid generation-config.json: ${generationConfigErrors.join(" ")}`);
}
const generationPaths = resolveJiraGenerationPaths(generationConfigValue as GenerationConfig, generationConfigPath);
const environment = resolveEnvironment(process.env.TEST_ENV ?? "test");

export default defineConfig({
  testDir: "./src/tests",
  timeout: environment.timeoutMs,
  expect: { timeout: 10000 },
  fullyParallel: true,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: generationPaths.uiReports }]
  ],
  outputDir: generationPaths.uiTestResults,
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    baseURL: environment.baseUrl,
    headless: true
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } }
  ]
});
