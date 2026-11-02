# Backend

Express 5 on Vercel. Each module in `src/modules/<name>/` is routes →
service → repository, wired together in `src/routes.ts`. Routers are
factories that receive `{ service, requireAuth, optionalAuth }`. Express 5
forwards rejected promises, so handlers have no try/catch: throw an
`AppError` and `middleware/errorHandler.ts` answers with
`{ error: { code, message, details?, requestId } }`. A 5xx never shows its
message, and is written to `server_errors`.

## Who is asking

- The caller comes from the token, never from a param or the body: each
  routes file's `callerId(req)`. "My" things live under `/me/...` routers.
- Signed-in routes use `requireAuth`; routes that read differently for a
  signed-in viewer use `optionalAuth`.
- Something that isn't yours answers **404**, not 403, so it doesn't reveal
  that it exists: scope the query by owner, or check the owner and throw
  `AppError.notFound`. `lib/authz.ts` has `assertOwner` and `assertAdmin` for
  the cases a 403 is right; call them from services.
- Admin routes go in `modules/admin/admin.routes.ts`, behind the
  `/admin` mount's `requireAdmin`, which re-reads `profiles.is_admin` on
  every request and answers 404 to anyone else. An admin-only action
  elsewhere checks `assertAdmin` in its service.
- Destroying or exporting an account wants a sign-in within ten minutes:
  `requireRecentSignIn` after `requireAuth`. Use it for anything as drastic.

## Input

- Every body, query and param is checked by `validate({ body, query, params })`
  against a zod schema from `@playrates/shared`, and read back from
  `req.valid!`, never `req.body`.
- Write schemas are `.strict()`, so an unknown key is refused. Services
  build their database patch field by field, never by spreading the body.
- Limits live in the schema: `PaginationSchema` caps `page` at 1000 and
  `limit` at 100; usernames are 3 to 24 characters, 40 in a path. Anything
  free-text gets a `max`.
- Uploads go through `lib/cleanUpload.ts`, which re-encodes to WebP so only
  the pixels survive, under a size limit on the raw body. Stored files live
  under their owner's id, and a message may only use pictures its author
  uploaded (`assertOwnImages`).

## Privacy

- `profileGate(username, viewerId)` (`modules/profiles/profileGate.ts`) is
  the one gate for anything listing a person's games, reviews, lists,
  friends, favourites, Gaming 25, threads or badges. It throws 404 for no
  such profile and 403 `profile_private` when the viewer can't see it.
  `canSeeProfile` in `shared` is the rule itself, shared with the frontend.
- A picture that can leave the site (player card, Gaming 25 image) is drawn
  only for a profile open to everyone.
- Sexually explicit games: hidden unless the viewer has
  `show_sexual_content` on, which needs `adult_confirmed_at`. Repositories
  take a `showSexualContent` argument; a game page answers 404 when it's
  hidden. Lists refuse them.
- A new table holding a member's rows goes into `collect` in
  `modules/profiles/accountExport.repository.ts`. Rows that aren't removed by the cascade when the auth user is
  deleted (ids kept for counting, logs) are cleared or anonymised in the
  `erase_account_traces` function.
- Logged paths drop the query string, and tokens in paths are masked.

## Abuse and load

- `perMinute(name, limit)` from `lib/rateLimit.ts`, built inside the router
  factory with a name of its own. Writes are limited globally at 60 a
  minute; add a tighter limit to anything expensive, public or that sends
  something (search, uploads, posting, reports, image drawing, imports,
  exports). It counts in Upstash when configured, in memory otherwise.
- `lib/publicCache.ts` lets the CDN answer anonymous GETs for games, stats,
  reviews, lists and community. Add a path only if its answer is the same for
  every signed-out visitor; never anything about profiles or users, so a
  profile made private disappears at once. The frontend marks such calls
  `anonymous: true`.
- IGDB calls a person is waiting on use the `QUICK` patience in
  `providers/games/igdb/igdb.provider.ts` (6 seconds, two tries); batch work
  may use `PATIENT`. With Upstash configured, every instance shares one pace
  and one token.

## Headers

`config/siteHeaders.ts` holds the CSP and security headers for pages, and
`vercel.json` repeats them for static files; a test checks the two match.
Allowing a new image, script or connection host means editing both. The
image list is short on purpose: a stray image is a tracking pixel.

## Supabase

The API uses the service-role key, and only the API: every table has RLS on
with no policies, so the browser reaches no data except through Express. The
frontend uses Supabase for sign-in alone. See `supabase/CLAUDE.md`.

## Email

- Categories and their defaults are `EMAIL_CATEGORIES` in
  `shared/src/schemas/emailPrefs.ts`. `EMAIL_CATEGORY_OF` decides which
  notifications also send an email; `emailAllowed(resolveEmailPrefs(...), c)`
  checks both the category and the all-emails switch.
- Services never send email themselves: raising a notification does it,
  through the `withEmails` wrapper.
- Every email that isn't an account email carries one-click unsubscribe
  links and headers from `addressed(userId, scope)`. Without
  `EMAIL_SIGNING_SECRET` it returns null and the email isn't sent: nothing
  goes out that can't be stopped.
- Sends go through `sendCounted`, under the daily cap in `EMAIL_LIMITS`,
  which leaves room for Supabase's own auth emails. Anything sent once per
  member and period claims it first (`claim`, or `claimOnce` into
  `email_log`) and releases the claim if the send fails or is capped.
- News needs a ticked box at sign-up. Admin test sends go to the admin's own
  address only.
- Templates live in `modules/email/email.templates.ts` on the shared layout,
  with HTML and plain text. They contain no em dashes (tested).

## Push

`modules/push`. A notification kind pushes if it's in `PUSHED`; reminders
only for members who asked for them. The admins get a push when someone
finishes signing up. Without VAPID keys nothing is pushed or offered.

## Scheduled jobs

Vercel's plan allows two crons: `trending` (05:00 UTC) and `nudges` (17:00
UTC) in `modules/games/cron.routes.ts`. New daily work becomes another part
of one of them, through `partOf`, so one part failing doesn't stop the rest
and the admins are emailed about it. The weekly digest runs on Sunday's
`nudges` and no other day. The routes answer 404 without the right
`CRON_SECRET`, compared in constant time.

## When something goes wrong

Server errors go to `server_errors`, browser errors to `client_errors`
(through the open, rate-limited `POST /client-errors`); both show on
Admin › Health and are pruned after 90 days. A spike, or a failed cron part,
emails the admins (`modules/admin/alerts.ts`). Code that runs after the
response (`defer`) catches and logs its own errors, so it never fails the
request that caused it.

## Tests

Route tests build the whole app on in-memory repositories:
`buildTestApp({ seed, push?, steam? })` in `tests/helpers/buildTestApp.ts`,
with `authHeader(USER_A)` (and `staleAuthHeader` for an old sign-in),
fixtures in `tests/helpers/fixtures.ts`, `createPushRecorder()` for pushes.
Work deferred past the response, email and push included, has run once you
`await email.flush()`. A new repository method gets its in-memory twin in
`tests/helpers/`. Shared schemas are tested from here
(`tests/unit/schemas.test.ts`).
