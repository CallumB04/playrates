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
 *  from this client is an ApiError. */
export const isNotFound = (error: unknown): boolean =>
    error instanceof ApiError && error.isNotFound;

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
    /** Query parameters. Empty ones are left out. */
    params?: object;
    headers?: Record<string, string>;
    /** "blob" for a download; JSON otherwise. */
    responseType?: "json" | "blob";
    signal?: AbortSignal;
    /** Sent without the token, for a read whose answer is the same for
     *  everyone, so the CDN can serve it. */
    anonymous?: boolean;
}

export interface ApiResponse<T> {
    data: T;
    status: number;
}

const BASE = `${env.apiBaseUrl}/api/v1`;
/* Long enough for a cold function and a slow phone; a request left hanging
   past it is one the person has given up on. */
const TIMEOUT_MS = 15_000;

const urlFor = (path: string, params?: object): string => {
    const url = new URL(`${BASE}${path}`);
    for (const [key, value] of Object.entries(params ?? {}) as [
        string,
        QueryValue,
    ][]) {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
};

/* A timeout of its own, and the caller's signal if there is one. Done by
   hand rather than with AbortSignal.any, which older Safari lacks. */
const deadline = (signal?: AbortSignal) => {
    const controller = new AbortController();
    const timer = setTimeout(
        () => controller.abort(new DOMException("timed out", "TimeoutError")),
        TIMEOUT_MS
    );
    signal?.addEventListener("abort", () => controller.abort(signal.reason), {
        once: true,
    });
    return { signal: controller.signal, done: () => clearTimeout(timer) };
};

const bodyFor = (body: unknown, headers: Headers): BodyInit | undefined => {
    if (body === undefined) return undefined;
    if (body instanceof Blob || body instanceof FormData) return body;
    headers.set("Content-Type", "application/json");
    return JSON.stringify(body);
};

const readError = async (response: Response): Promise<ApiError> => {
    const envelope = (await response.json().catch(() => null)) as {
        error?: ApiErrorBody["error"];
    } | null;
    const error = envelope?.error;
    return new ApiError(
        error?.message ?? `Request failed with status code ${response.status}`,
        response.status,
        error?.code,
        error?.details
    );
};

const request = async <T>(
    method: string,
    path: string,
    body: unknown,
    options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
    const headers = new Headers(options.headers);
    if (!options.anonymous) {
        // getSession() refreshes the token first when it needs to.
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const { signal, done } = deadline(options.signal);
    let response: Response;
    try {
        response = await fetch(urlFor(path, options.params), {
            method,
            headers,
            body: bodyFor(body, headers),
            signal,
        });
    } catch (error) {
        throw new ApiError(
            error instanceof DOMException && error.name === "TimeoutError"
                ? "The request timed out"
                : "Network Error"
        );
    } finally {
        done();
    }

    if (!response.ok) throw await readError(response);
    if (options.responseType === "blob") {
        return { data: (await response.blob()) as T, status: response.status };
    }
    // 204, or any body that isn't JSON, reads as nothing.
    const text = await response.text();
    return {
        data: (text ? JSON.parse(text) : undefined) as T,
        status: response.status,
    };
};

/** The single client. Endpoint modules import this rather than calling
 *  fetch themselves, so every request carries the token and fails as an
 *  ApiError. */
export const api = {
    get: <T>(path: string, options?: RequestOptions) =>
        request<T>("GET", path, undefined, options),
    delete: <T>(path: string, options?: RequestOptions) =>
        request<T>("DELETE", path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>("POST", path, body, options),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>("PUT", path, body, options),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>("PATCH", path, body, options),
};
