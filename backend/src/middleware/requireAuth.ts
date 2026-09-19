import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";

/**
 * Verifies the Supabase access token locally against the project's published
 * JWKS, rather than calling supabase.auth.getUser() on every request.
 *
 * The trade-off is deliberate: getUser() is a network round-trip per request
 * (30-100ms, and an availability dependency), while a signature check is
 * sub-millisecond. The cost is that a revoked session stays valid until it
 * expires. For a game tracker that is fine; anywhere it isn't, call getUser()
 * on that specific route.
 */
export type Verifier = (token: string) => Promise<JWTPayload>;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const getJwks = () => {
    jwks ??= createRemoteJWKSet(
        new URL(`${env().SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
        { cacheMaxAge: 10 * 60_000, cooldownDuration: 30_000 }
    );
    return jwks;
};

export const verifySupabaseJwt: Verifier = async (token) => {
    const { payload } = await jwtVerify(token, getJwks(), {
        issuer: `${env().SUPABASE_URL}/auth/v1`,
        audience: "authenticated",
    });
    return payload;
};

const readBearer = (header?: string): string | null => {
    if (!header) return null;
    const [scheme, token] = header.split(" ");
    return scheme?.toLowerCase() === "bearer" && token ? token : null;
};

/**
 * The verifier is injectable so route tests can authenticate without signing
 * real JWTs, while still exercising the whole middleware chain.
 */
export const makeRequireAuth = (
    verify: Verifier = verifySupabaseJwt,
    { optional = false }: { optional?: boolean } = {}
): RequestHandler => {
    return async (req, _res, next) => {
        const token = readBearer(req.headers.authorization);

        if (!token) {
            if (optional) return next();
            return next(AppError.unauthorized("Missing bearer token"));
        }

        try {
            const payload = await verify(token);
            if (!payload.sub) throw new Error("token has no subject");
            req.auth = {
                userId: payload.sub,
                email: typeof payload.email === "string" ? payload.email : undefined,
            };
            next();
        } catch {
            if (optional) return next();
            next(AppError.unauthorized("Invalid or expired token"));
        }
    };
};
