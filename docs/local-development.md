# Local development

PlayRates can run against a database on your own machine: a copy of the real
game catalogue, and a made-up community using it. Change anything you like.
Nothing reaches live, and every start puts it all back.

```bash
npm run dev:local
```

That starts the local Supabase stack in Docker (the first run pulls the
images), resets the database to the seed, and runs the app at
<http://localhost:5173> with the API on :3000. The header shows a **Local**
tag so it's never mistaken for the live site.

| Command                  | What it does                                                   |
| ------------------------ | -------------------------------------------------------------- |
| `npm run dev:local`      | Reset the local database, then run the app against it          |
| `npm run db:reset:local` | Reset only, while the app keeps running                        |
| `npm run local:snapshot` | Take a fresh copy of the live catalogue (read-only against live) |
| `npx supabase stop`      | Stop the local stack                                           |

Your edits last while it runs: through page reloads and code changes. The next
`npm run dev:local`, or `npm run db:reset:local`, throws them away.

## What runs where

| Service            | Address                  |
| ------------------ | ------------------------ |
| App                | <http://localhost:5173>  |
| API                | <http://localhost:3000>  |
| Supabase API       | <http://127.0.0.1:55321> |
| Studio (the data)  | <http://127.0.0.1:55323> |
| Emails sent        | <http://127.0.0.1:55324> |
| Postgres           | `127.0.0.1:55322`        |

Ports are 553xx rather than Supabase's default 543xx, so this runs beside
another local Supabase project.

- **Emails are caught, not sent.** A password reset lands in the mail viewer on
  :55324, and its link brings you back to the local app.
- **IGDB is off.** Search covers the local catalogue only, and your IGDB
  credentials and quota are never used.
- **Uploads** (avatars, images in threads) go to local storage.

## Accounts

Every account's password is **`playrates-local`**, and every email is
`<username>@playrates.test`. They exist only on your machine.

| Account          | For                                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `tester`         | You. An admin with something in every state the app has to draw     |
| `newcomer`       | A brand new account: the welcome, and every empty state             |
| `playrates_team` | Staff. Signs the patch notes and the announcement                   |
| 38 others        | The community: `marlowe`, `tessellate`, `quietriver`, `nightjar`, … |

### What `tester` has

**A log per platform**

| Game                                    | Logs                                                | Tests                                              |
| --------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| The Witcher 3: Wild Hunt                | PS5 finished · Switch playing, both reviewed        | The "Your logs" plate, totals, reviews per console |
| Grand Theft Auto V                      | Steam mastered (50/50 achievements) · PS4 finished · Xbox One backlog | Three consoles, on three shelves |
| Grand Theft Auto: San Andreas           | One with no console · PS4 shelved                   | "Platform not set" beside a named console          |
| The Legend of Zelda: Breath of the Wild | Switch finished · Wii U retired                     | Every console logged: nothing left to add          |
| Portal 2                                | Steam finished                                      | One log: "Played it on another platform?"          |
| The Elder Scrolls V: Skyrim             | Backlog, no console                                 | A quick add, then adding a console to it           |

**Everything else**

- **Shelves.** 39 played (enough to page), 3 playing, 11 backlog, 8 wishlist.
  Ratings, hours, dates and achievements are filled in on some and not others,
  as people really leave them. This year's finishes are spread across the
  months, for the year chart.
- **Reviews.** Public, one private, one behind a spoiler warning. The PS5
  Witcher review has 12 upvotes.
- **Friends.** Six (`marlowe`, `tessellate`, `quietriver`, `halcyon`,
  `nightjar`, `obsidian`). Requests in from `pixelwren` and `frostbyte`, and
  one out to `cinderlane`. Friends logged games this week, one of them on a
  second console, so the home feed has something in it.
- **Community.** The tester's own thread ("…: PS5 or Switch?") with five
  replies. A message of theirs in someone else's thread has seven upvotes.
  There are 22 more threads, the patch notes, and votes throughout.
- **Notifications.** Six unread: two friend requests, two replies, a review
  milestone and an announcement. Older ones are already read.
- **Admin.** The tester is an admin. There are reports waiting (three open,
  one resolved) and a few months of activity for the dashboard's charts.

## How it's built

- `backend/scripts/local/snapshot.ts` copies the 3,000 best-known games, and
  whatever is trending, from live to `supabase/seed/catalogue.json`. It only
  reads. It runs once, the first time, and again only if you ask.
- `backend/scripts/local/buildSeed.ts` turns that into SQL: the catalogue, then
  a community generated around it. It's random but seeded, so every reset
  gives the same people and logs. Dates are worked out at the time it runs, so
  the world is always current.
- `supabase db reset --local` applies every migration to an empty database,
  then runs the seed. This is also a check that the migrations work from
  scratch.
- `scripts/dev-local.mjs` ties it together. It hands the backend and the
  frontend the local stack's address and keys, which win over
  `backend/.env`, so nothing here can reach live.

`supabase/seed/` is gitignored, since it's built from live data.
