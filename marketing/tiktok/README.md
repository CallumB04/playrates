# TikTok slideshows

Ranked-list photo posts in the site's own design: a hook, a sign-up slide,
then one slide per game. Each post is a JSON file in `posts/`; the script
fills in the rest from the games table. The post files and their checklist,
`POSTS.md`, live only on the machine that makes them (they're gitignored);
the generator is what's shared. The `/tiktok-post` skill walks through making
one end to end.

```bash
npm run tiktok -- marketing/tiktok/posts/best-horror-games.json
```

That writes `out/<post>/`: `slides/01-hook.png` … `slides/12-rank-01.png`
(1080×1920, in upload order, alone in their folder so uploading is
select-all), `posting.md` (title, description, sound, comment to pin, when
to post and a checklist), `description.txt` for pasting, and
`contact-sheet.png` for checking the set at
a glance. `--html` writes only `index.html`, which opens in a browser and is
quicker while tweaking copy. `out/` is gitignored.

It needs `backend/.env` (it reads the games table the same way the backend's
scripts do) and Playwright's Chromium (`npx playwright install chromium` once
per machine). Art comes from IGDB's CDN, so a post costs no RAWG requests.

## What's been posted

`POSTS.md`, beside `posts/`, is the checklist: every post in the order it
should go out, ticked with its date and link once it's live:

    - [x] [best-horror-games](posts/best-horror-games.json) — 2026-10-14 — https://www.tiktok.com/@playratesapp/photo/…

`npm run tiktok` warns about a post that isn't on it.

## Making a new post

Start from an existing post in `posts/` (the fields below are the whole
format), add it to `POSTS.md`, and set:

- `tiktok` — what goes in the app with the slides: `title` (90 characters at
  most), `description` (keep it to about five hashtags), `song` and
  `altSong`, `musicSearch` (keywords to search for if neither song is
  available), `pinnedComment` and `when`.

- `hook.title`, `cta.title` — wrap one word in `*stars*` to colour it, and
  use `\n` to force a line break if the wrapping strands a word.
- `hook.icon` — any [Lucide](https://lucide.dev/icons) name, e.g. `Swords`
  for RPGs, `Skull` for horror. Defaults to `Trophy`.
- `games` — **#1 first**, by slug. Remakes and ports share a title, so look
  the slug up rather than guessing it (`resident-evil-2--1` is the 2019
  remake):
  `npx supabase db query --linked "select slug, title, release_date from games where title ilike '%resident evil 2%'"`.
  `order: "countdown"` shows #10 first so the reveal is the last swipe;
  `"ranked"` shows #1 first.
- `cta.library` — the three games in the mock library on slide 2, with a
  status (`played`, `playing`, `backlog`, `wishlist`, `finished`) and an
  optional rating. Pick from the bottom of the list so the top isn't spoiled.
- `showCriticScore` — drop it for lists where the critic score would argue
  with the ranking.

Per game, besides `slug` and `blurb` (two lines at most — about 85
characters):

- `banner` — the stored screenshot is used by default. Set `"artwork"` for
  IGDB key art instead (usually moodier, and free of HUDs), a bare IGDB image
  id, or any URL. Check the contact sheet: screenshots with UI, text or an
  awkward subject are worth swapping.
- `bannerPosition` — CSS `background-position`, if the crop misses.
- `title`, `developer`, `cover` — overrides for when the stored value reads
  badly (`"developer": "Capcom"` rather than "Capcom Development Division 1").
  A `cta.library` entry takes a `title` too, for a name too long for its row.
- `stat` — a short figure shown with an icon in the details line, like
  `"~8h"` for the weekend post; set the post's `statIcon` to a Lucide name
  (default `Clock`).

To find a better banner than the stored one, list the game's IGDB screenshots
with the credentials in `backend/.env` (`POST https://api.igdb.com/v4/screenshots`,
body `fields image_id; where game = <igdb_id>;`) and use an `image_id`.

The script warns about anything it can measure: copy running into the caption
area or under the rail, a name cut to an ellipsis, a blurb past two lines. A
clean run prints no warnings; the contact sheet is for everything else (HUDs,
letterboxing, logo-only artwork, a crop that misses).

## Layout rules

TikTok draws its own UI over a photo post, so everything that has to be read
sits inside `--safe-top`, `--safe-bottom` and `--rail` in `slides.css`: clear
of the tabs at the top, the caption at the bottom and the like/comment column
down the right. Long titles wrap to two lines and push the slide up rather
than down, so the bottom edge stays put.
