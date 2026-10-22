import { resolveEnvironment } from "../config/environment.js";

const environment = resolveEnvironment(process.env.NODE_ENV || process.env.TEST_ENV || "test");

export const appEnvironment = environment;
