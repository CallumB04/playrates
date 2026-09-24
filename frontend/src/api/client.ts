import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "@playrates/shared";
import { env } from "../lib/env";
import { supabase } from "../lib/supabase";

/** Carries the API's status and code, so callers can tell 404 from 500. */
export class ApiError extends Error {
    readonly status?: number;
    readonly code?: string;
    readonly details?: unknown;

    constructor(
        message: string,
        status?: number,
        code?: string,
        details?: unknown
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.details = details;
    }

    get isNotFound(): boolean {
        return this.status === 404;
    }

    get isUnauthorized(): boolean {
        return this.status === 401 || this.status === 403;
    }

    get isValidation(): boolean {
        return this.status === 422;
    }

    get isServerError(): boolean {
        return this.status !== undefined && this.status >= 500;
    }
}

/** "Is this the API saying there is nothing here?" — the answer to a lookup
 *  that is allowed to come back empty, rather than a failure. Every rejection
 *  from this client is an ApiError, so checking for an AxiosError never
 *  matches. */
export const isNotFound = (error: unknown): boolean =>
    error instanceof ApiError && error.isNotFound;

/** The single client. Endpoint modules import this rather than axios itself. */
export const api = axios.create({
    baseURL: `${env.apiBaseUrl}/api/v1`,
    timeout: 15_000,
});

// attach the Supabase access token; getSession() refreshes it when needed
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorBody>) => {
        const body = error.response?.data?.error;
        return Promise.reject(
            new ApiError(
                body?.message ?? error.message,
                error.response?.status,
                body?.code,
                body?.details
            )
        );
    }
);
