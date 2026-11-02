# PlayRates

A video game tracker. React + TypeScript (`frontend`), Node + Express
(`backend`), shared zod schemas and helpers in `shared`, Supabase for data and
auth. Deployed on Vercel: one function serves the API and every page's HTML,
another runs the crons.

The detail lives beside the code it governs, and loads when you work there:

- `frontend/CLAUDE.md`: mobile, styling, UI primitives, accessibility,
  performance, data fetching, signed-out states, the PWA.
- `backend/CLAUDE.md`: auth, privacy, validation, rate limits, headers,
  caching, email, push, crons, errors.
- `supabase/CLAUDE.md`: migrations, RLS, functions, views, pgTAP, types.

```bash
npm run dev:local        # local Supabase in Docker, reseeded: app :5173, API :3000
npm run dev              # the same app against whatever .env names, which can be live
npm run typecheck        # every workspace, the tests and api/
npm run lint             # frontend and backend
npm run test:coverage    # vitest with the coverage thresholds CI enforces
npm run build && npm run size -w frontend   # the build, then the first-load JS budget
npm run smoke            # a real browser through the local stack at phone width
```

The local stack is described in `docs/local-development.md`: every seeded
account's password is `playrates-local` (`tester` is an admin with data in
every state, `newcomer` is empty), and outgoing email lands in Mailpit on
:55324. The `playrates-local-keep` launch config starts it without reseeding.

## Done means CI would pass

A change is finished when all of these pass, not after someone asks:

- `npm run typecheck`, `npm run lint` (warnings allowed, no errors).
- `npm run test:coverage`. Thresholds are 95% statements, functions and
  lines, 90% branches, in both workspaces. New code in a covered folder
  brings its tests or the run fails.
- `npm run build` and `npm run size -w frontend`. The first-load budget is
  212 KB gzipped; lower it freely, raise it only on purpose.
- CI also runs `npm audit --omit=dev --audit-level=high`, applies every
  migration to a clean database, runs the pgTAP tests and fails if
  `backend/src/types/database.generated.ts` has drifted from the schema.
- UI changes are looked at in the running app at desktop and at 375px, in
  both themes.

`shared` is consumed as built output: after editing `shared/src`, run
`npm run build -w @playrates/shared` or the other workspaces see the old code.

## The rules every change keeps

### Old tabs and old deploys keep working

A tab can run last week's frontend against today's API, and a migration runs
before the code that needs it is deployed. So the API and the database stay
backwards compatible: add a column, a function or an endpoint beside the old
one, move the callers over, and remove the old one in a later change. Never
change the shape of something deployed code still reads.

### People's data is theirs

- Anything that shows someone's games, reviews, lists, friends, threads or
  badges goes through the profile gate, so private and friends-only profiles
  stay that way. Pictures that leave the site (player card, Gaming 25) are
  drawn for public profiles only.
- Sexually explicit games stay hidden from anyone who hasn't opted in and
  declared they're 18 or over, and are kept out of search engines.
- A new table holding someone's data joins the account export and account
  deletion (see `backend/CLAUDE.md`).
- A new outside service that sees member data goes into the privacy policy
  (`frontend/src/pages/legal`), in the same change.
- Email is opt-in where the law asks for it (news) and every category can be
  switched off. A new kind of email picks a category and a default; anything
  a member didn't ask for starts off.

### A new page is a page for search engines too

Every route in `frontend/src/App.tsx` is also served by the API's pages router
with its own head, or it answers 404 (a test fails first). Adding a route
means, in the same change:

1. The route in `App.tsx`, as a `lazy()` import.
2. Its head on the server: an entry in `FIXED_PAGES` (`shared/src/seo.ts`) for
   a fixed page, or a route in `backend/src/modules/pages/pages.routes.ts`
   with a `PagesService` method returning `HeadMeta | null` (null is a real
   404). A data page gets JSON-LD and, where it's public, page text in `body`.
3. `noindex` on anything personal, private, adult or a step in a flow, on the
   server and in the page's `usePageMeta`, which must agree.
4. Public, indexable pages go in the sitemap (`sitemap.ts`).
5. A new route parameter name added to `sample()` in
   `backend/tests/routes/pages.route.test.ts`.

### Features that need a key degrade without it

Upstash, Steam, VAPID, Resend, IGDB and the cron secret are all optional.
Without one, its feature hides itself or falls back (`backend/.env.example`
lists each fallback); nothing crashes and nothing is half-shown. A new
integration follows suit, and its variable goes in `.env.example`.

### Wording

User-facing text is reviewed before it ships. It never uses an em dash (a
test enforces this for emails); a missing value is an en dash `–`. New copy
uses curly apostrophes (`’`) and the ellipsis character (`…`), in British
English, and sounds like a person rather than a product.

## Comments

Comment the _why_. Never the _what_: if the code already says it, say nothing.

```tsx
// no: narrates the class
// 44px on a phone, tighter from sm
className = "min-h-11 sm:min-h-0";

// yes: records something the code cannot say
// 16px: iOS Safari zooms the page in on a smaller field and never back out.
className = "text-base sm:text-body-sm";
```

Most changes need no comment at all. A line or two where they do. A comment
that restates the diff is worse than none, and a long one is worse still.

## Tests

Pure logic gets a test: reducers, mappers, validators, formatters, and anything
with branches worth naming. Frontend tests sit beside the source
(`lib/pageRange.test.ts`, `components/gamelog/logEditorReducer.test.ts`);
backend unit tests go in `backend/tests/unit/`, route tests in
`backend/tests/routes/`, database tests in `supabase/tests/database/`.

Components get a test when they carry behaviour rather than markup; see
`ui/Dropdown.test.tsx` and `ui/Modal.test.tsx`. Thin wrappers and config do
not (`lib/cn.ts`, `lib/env.ts`, `lib/supabase.ts`).

Test names say what the code does, as a sentence ("pushes a friend request to
the devices that said yes"). A security or privacy rule gets a test that it
refuses: the wrong user, the signed-out visitor, the private profile.

When a bug is fixed, the test that would have caught it goes in with the fix.

## Formatting

Prettier is configured for the frontend (`frontend/.prettierrc`, 4 spaces);
the backend and shared use Prettier's defaults (2 spaces). Several files on
main are not Prettier-clean, and CI doesn't check: format only the files you
change, and if one wasn't clean before, keep your diff to your own lines
rather than reformatting the file. Never format
`backend/src/types/database.generated.ts`.
