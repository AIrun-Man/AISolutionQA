import type { z } from "zod";

export type ValidationResult = {
  valid: boolean;
  status: number;
  errors: string[];
};

export interface ResponseValidationInput {
  status: number;
  expectedStatuses: readonly number[];
  headers?: Record<string, string>;
  requiredHeaders?: readonly string[];
  data?: unknown;
  schema?: z.ZodType;
}

export function validateResponse(input: ResponseValidationInput): ValidationResult {
  const errors: string[] = [];
  if (!input.expectedStatuses.includes(input.status)) {
    errors.push(`Expected status ${input.expectedStatuses.join(" or ")} but received ${input.status}.`);
  }
  const normalizedHeaders = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
  );
  for (const header of input.requiredHeaders ?? []) {
    if (!(header.toLowerCase() in normalizedHeaders)) {
      errors.push(`Required response header is missing: ${header}.`);
    }
  }
  if (input.schema) {
    const schemaResult = input.schema.safeParse(input.data);
    if (!schemaResult.success) {
      errors.push(...schemaResult.error.issues.map((issue) => `${issue.path.join(".") || "$"}: ${issue.message}`));
    }
  }

  return {
    valid: errors.length === 0,
    status: input.status,
    errors
  };
}
