/**
 * Validation pipeline behavior — validates request against schema before handler runs.
 * @module mediatr/behaviors/validation
 */

import type { IPipelineBehavior, IRequest, IRequestWithMetadata } from "../types.ts";

/** Generic validator interface — plug in Zod, Ajv, or anything */
export interface IValidator {
  validate(schema: unknown, data: unknown): ValidationResult;
}

export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

export class ValidationError extends Error {
  constructor(
    public readonly errors: string[],
    message?: string,
  ) {
    super(message ?? `Validation failed: ${errors.join("; ")}`);
    this.name = "ValidationError";
  }
}

/**
 * Validates requests that carry a `__metadata.validationSchema`.
 * Skips validation if no schema is present or no validator is configured.
 */
export class ValidationBehavior implements IPipelineBehavior {
  constructor(private validator?: IValidator) {}

  async handle<TResponse>(
    request: IRequest<TResponse>,
    next: () => Promise<TResponse>,
  ): Promise<TResponse> {
    const meta = (request as IRequestWithMetadata<TResponse>).__metadata;
    const schema = meta?.validationSchema;

    if (schema && this.validator) {
      const result = this.validator.validate(schema, request);
      if (!result.success) {
        throw new ValidationError(result.errors ?? ["Unknown validation error"]);
      }
    }

    return next();
  }
}
