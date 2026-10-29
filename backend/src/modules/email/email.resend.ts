const API = "https://api.resend.com";
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
/** Resend allows ten requests a second across the team; half that leaves
 *  room for a second instance and the dashboard. */
const MIN_INTERVAL_MS = 200;

/** What Resend said when it refused, with its own error name
 *  (`daily_quota_exceeded`, `validation_error`) where it gave one. */
export class ResendError extends Error {
  constructor(
    readonly status: number,
    readonly type: string | null,
    message: string,
  ) {
    super(message);
    this.name = "ResendError";
  }
}

export interface ResendClient {
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
}

export interface ResendClientOptions {
  /** Waits between attempts; a test passes one that doesn't. */
  sleep?: (ms: number) => Promise<void>;
  minIntervalMs?: number;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Resend's HTTP API, one request at a time with a gap between them, as the
 * IGDB provider does it. A 5xx or a dropped connection is tried again; a
 * 429 is not, since it is either the rate limit (which the gap is there to
 * avoid) or the day's quota, which retrying only burns through faster.
 */
export const createResendClient = (
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  { sleep = wait, minIntervalMs = MIN_INTERVAL_MS }: ResendClientOptions = {},
): ResendClient => {
  let chain: Promise<unknown> = Promise.resolve();
  let lastCallAt = 0;

  const schedule = <T>(task: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const gap = Math.max(0, minIntervalMs - (Date.now() - lastCallAt));
      if (gap > 0) await sleep(gap);
      lastCallAt = Date.now();
      return task();
    });
    chain = run.catch(() => undefined);
    return run;
  };

  const attempt = async <T>(
    method: string,
    path: string,
    body: unknown,
  ): Promise<T> => {
    for (let n = 0; ; n++) {
      let response: Response;
      try {
        response = await fetchImpl(`${API}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            // Resend refuses a request without one.
            "User-Agent": "playrates-api",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        if (n === MAX_ATTEMPTS - 1) throw error;
        await sleep(2 ** n * 300);
        continue;
      }

      if (response.ok) {
        const text = await response.text();
        return (text ? JSON.parse(text) : {}) as T;
      }
      if (response.status >= 500 && n < MAX_ATTEMPTS - 1) {
        await sleep(2 ** n * 300);
        continue;
      }
      const detail = (await response.json().catch(() => ({}))) as {
        name?: string;
        message?: string;
      };
      throw new ResendError(
        response.status,
        detail.name ?? null,
        `Resend ${method} ${path} failed (${response.status}): ${detail.message ?? response.statusText}`,
      );
    }
  };

  return {
    request: (method, path, body) => schedule(() => attempt(method, path, body)),
  };
};
