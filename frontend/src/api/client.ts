import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "@playrates/shared";
import { env } from "../lib/env";
import { supabase } from "../lib/supabase";

/**
 * Preserves the status code and machine-readable code from the API.
 *
 * The old API layer collapsed every failure into `new Error("Error fetching
 * user")`, so a caller could not tell "this user does not exist" (show the
 * not-found screen) from "the backend is down" (offer a retry).
 */
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

/**
 * One instance, created once. The old code set `axios.defaults.baseURL` from
 * five separate modules, so whichever imported last won.
 */
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
