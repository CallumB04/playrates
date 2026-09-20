# PlayRates

PlayRates is a video game tracking website. Log the games you've played, rate
them, track hours and achievements, keep a backlog and wishlist, add friends,
and write reviews.

## Stack

| Part | Built with |
| --- | --- |
| `frontend/` | React 18, TypeScript, Vite, Tailwind, TanStack Query, React Router |
| `backend/` | Node, TypeScript (ESM), Express 5, Supabase JS |
| `shared/` | zod schemas and domain types used by both sides |
| Database | Postgres on Supabase; schema lives in `supabase/migrations/` |
| Auth | Supabase Auth on the frontend; the backend verifies the JWT |
| Games data | [RAWG](https://rawg.io/apidocs), proxied and cached by the backend |

The three packages are npm workspaces, so one `npm install` at the root covers
everything.

### How auth fits together

The frontend uses `supabase-js` **only** for signing up, signing in and keeping
the session fresh. It never queries tables. Every data request goes to the
Express API with the Supabase access token attached, and the backend verifies
that token and does all database work itself using the service-role key.

Row level security is enabled on every table with no policies, so the anon key
that ships in the browser bundle cannot reach anything directly.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- A [Supabase](https://supabase.com) project (the free tier is fine)
- A [RAWG API key](https://rawg.io/apidocs) — free, shown on the page as soon
  as you sign up. Optional: without it the app still runs, it just can't pull
  in new games.
- The [Supabase CLI](https://supabase.com/docs/guides/local-development), to
  apply migrations

### 1. Install

```bash
git clone https://github.com/CallumB04/playrates.git
cd playrates
npm install
```

### 2. Environment variables

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Fill in the values below. Everything is in your Supabase dashboard under
**Project Settings**.

**`frontend/.env`**

| Variable | Where it comes from |
| --- | --- |
| `VITE_API_BASE_URL` | The backend URL. `http://localhost:3000` for local dev. |
| `VITE_SUPABASE_URL` | Project Settings → Data API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API Keys → `anon` / public |

**`backend/.env`**

| Variable | Where it comes from |
| --- | --- |
| `PORT` | Port the API listens on. Defaults to `3000`. |
| `NODE_ENV` | `development`, `production` or `test` |
| `CORS_ORIGINS` | Comma-separated allowlist. `http://localhost:5173` for local dev. |
| `SUPABASE_URL` | Same value as `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → `service_role` |
| `RAWG_API_KEY` | https://rawg.io/apidocs |

> The service-role key bypasses row level security and can read and write every
> table. It must never be sent to the browser, committed, or given a `VITE_`
> prefix. Backend only.

### 3. Create the database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

That applies everything in `supabase/migrations/`, which is the single source
of truth for the schema. Never edit a migration that has already been applied —
add a new one with `npx supabase migration new <name>`.

### 4. Populate the games catalogue

```bash
npm run seed:games -w backend
```

Pulls a starter set of games through RAWG. Pass your own search terms to add
more, and re-run it as often as you like — games are upserted, not duplicated:

```bash
npm run seed:games -w backend -- "hollow knight" "celeste"
```

### 5. Run it

```bash
npm run dev
```

Frontend on http://localhost:5173, backend on http://localhost:3000.

## Local development against a local database

If you'd rather not point at a cloud project while developing, the Supabase CLI
runs the whole stack locally in Docker:

```bash
npx supabase start          # prints local URLs and keys for your .env files
npx supabase db reset       # applies migrations, then supabase/seed.sql
```

`supabase/seed.sql` creates two dev accounts (`dev@playrates.test` and
`friend@playrates.test`, both with the password `password123`), a few games, a
game log, a review and a friendship — enough to see every screen populated. It
only ever runs against the local stack.

## Scripts

Run from the repository root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Frontend and backend together |
| `npm run build` | Builds all three packages |
| `npm test` | Runs both test suites |
| `npm run lint` | ESLint over frontend and backend |
| `npm run typecheck` | `tsc --noEmit` over all three packages |

CI runs all of the above on every push and pull request, plus a second job that
boots a real Postgres and applies every migration and the seed — the two worst
bugs in this project so far only appeared against a real database.

Workspace-specific ones worth knowing:

| Command | What it does |
| --- | --- |
| `npm run test:watch -w backend` | Backend tests in watch mode |
| `npm run seed:games -w backend` | Import games from RAWG |
| `npm run db:types -w backend` | Regenerate DB types from the linked project |

## Project layout

```
shared/src/schemas/     zod schemas + types shared by frontend and backend
supabase/migrations/    the database schema, applied in filename order
supabase/seed.sql       local-only development fixtures

backend/src/
  config/               env parsing and the Supabase client
  middleware/           JWT verification, validation, error handling
  modules/<resource>/   routes -> service -> repository, one folder per resource
  providers/games/      the RAWG integration, behind a GamesProvider interface
backend/tests/          route tests run the real HTTP stack over in-memory repos

frontend/src/
  api/                  one axios client, typed endpoints, query keys
  app/                  providers, query client
  contexts/             auth, notifications, account form
  hooks/queries/        React Query wrappers per resource
  components/ui/        Modal, Pagination and other shared primitives
  pages/                one folder per route
  styles/theme.css      Tailwind entry point and the design tokens
```

## Design system

**Vellum — everything is a card, lit from above.** Surfaces float on a dark
ground, lifted by a soft ambient shadow, a tighter key shadow, and a 1px rim of
light along the top edge. Hovering brings the light closer. Nothing is pressed
in; box art is the only saturated thing on a page, and the chrome stays out of
its way.

Tailwind v4, configured entirely in `frontend/src/styles/theme.css` — there is
no `tailwind.config.js`. That file holds the tokens in two layers:

- **Primitives** — the raw ramps (`iris`, `ink`, `ember`). Deliberately *not*
  exposed as Tailwind utilities, so a component cannot pin itself to one shade
  and break the other theme.
- **Semantics** — what a colour is for (`surface`, `content`, `border`,
  `brand`, `danger`, …). This is the only layer components touch.

No colour is ever written literally in a component. If a shade is missing, add
a semantic token rather than reaching for an arbitrary value.

A few rules worth knowing before changing anything:

- **Depth is height, never pressure.** Elevation runs `e1` → `e3`, plus
  `shadow-modal` and the `shadow-glow` bloom that a hovered thing gathers. The
  `inset-shadow-*` names survive only as aliases and should not be used.
- **Type.** One sans (Geist) for headings and body; mono is reserved for real
  figures — ratings, hours, counts — and never for labels. The display steps
  are `clamp()`d, so they are fluid by default and no page needs its own
  responsive overrides.
- **Status is never carried by colour alone.** Every status has a distinct
  mark and its word rendered as real text, so a badge still reads in
  greyscale. Shape used to do this job and no longer does.
- **Measures are in `ch`, which is the width of the zero glyph.** Geist's is
  narrow, so a `max-w-[Nch]` renders roughly 27% longer than the number
  suggests. `--container-measure` is the tuned default.

Dark is the default and the mapping the palette was built for; light is a
genuine second design rather than an inversion, and needs its own pass when
tokens change. `ThemeContext` persists the choice, and a small script in
`index.html` applies it before first paint so there is no flash — the two must
agree on `DEFAULT_THEME`.

**The design library is at `/admin/design`.** It renders every token and every
shared component live, with a theme toggle. Swatches resolve their value from
probe elements in both themes at once, so the table reads the same whichever
theme you are browsing in, and `tokenCatalogue.test.ts` fails if the catalogue
names a token `theme.css` does not define.

> The admin area has no access control yet. It renders static demos and reads
> no user data, but it should be gated behind an admin role before the app is
> public.

## Deployment

Nothing is tied to a particular host. The frontend is a static build
(`npm run build -w frontend` → `frontend/dist`) and the backend is a plain Node
service (`npm run build -w backend`, then `npm start -w backend`).

To deploy, set the same environment variables listed above in your host, and
add your frontend's public URL to `CORS_ORIGINS` on the backend.
