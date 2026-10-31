import type { Logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      email?: string;
      /** When the session last proved who it is (a password, a provider),
       *  in ms. Refreshing the token doesn't move it. */
      signedInAt?: number;
    }

    interface ValidatedRequest {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    }

    interface Request {
      /** Set by requireAuth. Absent when the route allows anonymous access. */
      auth?: AuthContext;
      /** Set by validate(). Controllers read this, never req.body. */
      valid?: ValidatedRequest;
      id?: string;
      log?: Logger;
    }
  }
}

export {};
