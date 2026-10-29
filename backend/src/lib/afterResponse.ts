import { waitUntil } from "@vercel/functions";

/**
 * Work that finishes after the response has gone: an email, a contact
 * sync. On Vercel the function is kept alive for it, where otherwise it
 * would freeze the moment the response is sent; anywhere else it simply
 * runs. Never rejects: the caller has already answered.
 */
export const afterResponse = (
  work: Promise<unknown>,
  onError: (error: unknown) => void = () => {},
): void => {
  const settled = work.catch(onError);
  try {
    waitUntil(settled);
  } catch {
    // No request context to hold open, as in a script; it runs anyway.
  }
};

export type Defer = (work: Promise<unknown>) => void;
