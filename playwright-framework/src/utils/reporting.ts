export function createSummary(title: string, status: "passed" | "failed" | "skipped", details: string[]) {
  return {
    title,
    status,
    details
  };
}
