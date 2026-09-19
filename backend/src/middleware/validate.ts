import type { RequestHandler } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { AppError } from "../lib/AppError.js";

interface ValidationShape {
    body?: ZodTypeAny;
    query?: ZodTypeAny;
    params?: ZodTypeAny;
}

/**
 * Parses the request into `req.valid`. Controllers read from there and never
 * from `req.body` directly — that invariant is what keeps unvalidated input
 * out of the service layer.
 */
export const validate =
    (shape: ValidationShape): RequestHandler =>
    (req, _res, next) => {
        try {
            req.valid = {
                body: shape.body ? shape.body.parse(req.body) : undefined,
                query: shape.query ? shape.query.parse(req.query) : undefined,
                params: shape.params ? shape.params.parse(req.params) : undefined,
            };
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return next(
                    AppError.validation(
                        "Request validation failed",
                        error.flatten().fieldErrors
                    )
                );
            }
            next(error);
        }
    };
