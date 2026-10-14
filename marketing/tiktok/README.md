# TikTok slideshows

Ranked-list photo posts in the site's own design: a hook, a sign-up slide,
then one slide per game. Each post is a JSON file in `posts/`; the script
fills in the rest from the games table.

```bash
npm run tiktok -- marketing/tiktok/posts/best-horror-games.json
```

That writes `out/<post>/`: `01-hook.png` … `12-rank-01.png` (1080×1920, in
upload order), `caption.txt`, and `contact-sheet.png` for checking the set at
a glance. `--html` writes only `index.html`, which opens in a browser and is
quicker while tweaking copy. `out/` is gitignored.

It needs `backend/.env` (it reads the games table the same way the backend's
scripts do) and Playwright's Chromium (`npx playwright install chromium` once
per machine). Art comes from IGDB's CDN, so a post costs no RAWG requests.

## Making a new post

Copy `posts/best-horror-games.json` and change:

- `hook.title`, `cta.title` — wrap one word in `*stars*` to colour it.
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

## Layout rules

TikTok draws its own UI over a photo post, so everything that has to be read
sits inside `--safe-top`, `--safe-bottom` and `--rail` in `slides.css`: clear
of the tabs at the top, the caption at the bottom and the like/comment column
down the right. Long titles wrap to two lines and push the slide up rather
than down, so the bottom edge stays put.
