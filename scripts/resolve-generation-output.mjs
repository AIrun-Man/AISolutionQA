import { resolve } from "node:path";

import { loadGenerationConfig, resolveJiraGenerationPaths } from "../platform-core/dist/storage/generation.js";

const configPath = resolve(process.env.GENERATION_CONFIG_PATH ?? "generation-config.json");
const config = await loadGenerationConfig(configPath);
const paths = resolveJiraGenerationPaths(config, configPath);
console.log(paths.outputRoot);