import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ApiTestResult {
  testId: string;
  operationId: string;
  method: string;
  sanitizedUrl: string;
  status: number;
  durationMs: number;
  outcome: "passed" | "failed";
  validationErrors: string[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function writeApiReport(results: ApiTestResult[], outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const passed = results.filter((result) => result.outcome === "passed").length;
  const summary = { total: results.length, passed, failed: results.length - passed, results };
  const rows = results.map((result) =>
    `<tr><td>${escapeHtml(result.testId)}</td><td>${escapeHtml(result.operationId)}</td><td>${escapeHtml(result.method)}</td><td>${result.status}</td><td>${result.outcome}</td><td>${result.durationMs}</td></tr>`
  ).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>API Report</title></head><body><h1>API Report</h1><p>${passed}/${results.length} passed</p><table><thead><tr><th>Test</th><th>Operation</th><th>Method</th><th>Status</th><th>Outcome</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  await writeFile(join(outputDirectory, "results.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(join(outputDirectory, "index.html"), html, "utf8");
}
