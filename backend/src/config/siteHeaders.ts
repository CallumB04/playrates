/**
 * The security headers every page of the site is served with.
 *
 * vercel.json sets these on the static files; the pages Express renders
 * (game, profile and thread pages, for their link previews) set them from
 * here. A test holds the two copies to each other.
 */

// The one Supabase project the browser talks to, for auth.
const SUPABASE = "byctkyrrrtosivvzfrro.supabase.co";

export const SITE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Tiptap and React set inline styles.
  "style-src 'self' 'unsafe-inline'",
  // Cover art comes from IGDB's image servers, and game websites vary.
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' https://${SUPABASE} wss://${SUPABASE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const SITE_HEADERS: Record<string, string> = {
  "Content-Security-Policy": SITE_CSP,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};
