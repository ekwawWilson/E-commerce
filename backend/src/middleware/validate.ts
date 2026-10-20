import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { validationErrorResponse } from '../utils/response';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware to validate request data using Zod schemas
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return validationErrorResponse(res, errors);
      }
      next(error);
    }
  };
}

/**
 * Middleware to validate multiple targets at once
 */
export function validateRequest(options: ValidateOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Array<{ field: string; message: string }> = [];

      if (options.body) {
        try {
          req.body = await options.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((e) => ({
                field: `body.${e.path.join('.')}`,
                message: e.message,
              }))
            );
          }
        }
      }

      if (options.query) {
        try {
          req.query = await options.query.parseAsync(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((e) => ({
                field: `query.${e.path.join('.')}`,
                message: e.message,
              }))
            );
          }
        }
      }

      if (options.params) {
        try {
          req.params = await options.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((e) => ({
                field: `params.${e.path.join('.')}`,
                message: e.message,
              }))
            );
          }
        }
      }

      if (errors.length > 0) {
        return validationErrorResponse(res, errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
