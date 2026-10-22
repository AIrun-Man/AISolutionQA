import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseDocument } from "yaml";

const workflowDirectory = join(process.cwd(), ".github", "workflows");
const workflowFiles = (await readdir(workflowDirectory)).filter((name) => /\.ya?ml$/i.test(name));

if (workflowFiles.length === 0) {
  throw new Error("No GitHub Actions workflow files were found.");
}

for (const workflowFile of workflowFiles) {
  const source = await readFile(join(workflowDirectory, workflowFile), "utf8");
  const document = parseDocument(source, { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(`${workflowFile} is invalid:\n${document.errors.map((error) => error.message).join("\n")}`);
  }
  const workflow = document.toJS();
  if (!workflow?.name || !workflow?.on || !workflow?.jobs) {
    throw new Error(`${workflowFile} must define name, on, and jobs.`);
  }
}

console.log(`Validated ${workflowFiles.length} workflow files.`);
