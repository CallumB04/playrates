# TikTok posts

Posts for @playratesapp. Each post is a JSON file in `posts/`; the script
fills in the rest from the games table. The post files and their checklist,
`POSTS.md`, live only on the machine that makes them (they're gitignored);
the generator is what's shared. The `/tiktok-post` skill walks through
making one end to end.

## Starting again, 30 October 2026

Every post made before 30 October was deleted, on TikTok and here. The first
week of posts drew 550 to 650 views each, nearly all from For You. From 21
October every post drew 1 to 10, and the only search that found them was
the account's own name: TikTok had stopped showing them to anyone. That day
three posts were set to Private and fourteen were uploaded in a little over
two hours from a scripted browser, which is the likeliest trigger. Even at
their best the posts held people for about six seconds and won no
followers.

So the account now runs on one format, `list`, made to look like someone
put it together in the app, and the goal is followers (1,000 unlocks a bio
link), not sign-ups:

- **Photo slideshows only.** The quiz videos were the weakest posts and
  nobody watched them; their formats are kept but not used.
- **Hooks that give the viewer something**: tips ("6 tips for beginners in
  Elden Ring") or a top X ("Top 10 hardest video game bosses of all time").
- **No sign-up slide.** The description carries a light push and the bio
  keeps the address.
- **One post a day at a different time each evening**, 19:30 to 21:00
  Estonian time, uploaded one at a time and never in a batch.

```bash
npm run tiktok -- marketing/tiktok/posts/hardest-bosses.json
npm run tiktok:next     # every post so far, and a suggestion for the next
npm run test:tiktok     # the date and scheduling logic
```

For a photo post that writes `out/<post>/`: `slides/01-hook.png` onwards
(1080×1920, in upload order, alone in their folder so uploading is
select-all), `contact-sheet.png` for checking the set at a glance,
`posting.md` (title, description, sound, comment to pin, when to post and a
checklist) and `description.txt` for pasting. A video post writes
`video.mp4` and `cover.png` instead of the slides and contact sheet.
`--html` writes only `index.html`, which opens in a browser and is quicker
while tweaking copy. `out/` is gitignored.

It needs `backend/.env` (it reads the games table the same way the backend's
scripts do), Playwright's Chromium (`npx playwright install chromium` once
per machine) and, for videos, ffmpeg. Art comes from IGDB's CDN, so a post
costs no RAWG requests.

## The list format

`"format": "list"`. A picture fills each slide, and the words are set in
TikTok Sans the way TikTok's own text tool sets them: the hook and each
item's name in its boxed style (dark words on a white box per line), the
one line under a name in its plain style (white with a soft shadow). No
logo, no brand line, no numbers drawn in outline, no colour of our own.

- `hook`: `text` and `art` (a game entry, below). `\n` forces a break, but
  wrapping is balanced, so it's rarely needed.
- `items`: **#1 first**, each `{ title, line, art }`. The slide shows
  `"<n>. <title>"`; `title` defaults to the art's game title. `line` is one
  sentence, two lines at most.
- `countdown: true` shows the items from the bottom up, so #1 is the last
  swipe. Tips leave it off.
- `outro` (optional): `text` and `art`, a last boxed slide.
- `tiktok.time`: required, `HH:MM` between 19:30 and 21:00. `npm run
  tiktok:next` lists every post so far, then the first free day and a time
  for it picked at random.

`simple.css` is its stylesheet; nothing else uses it.

## The first run's formats

Everything below documents the formats used from 14 to 30 October. They
still render, but none is in use, and the design and sign-up rules further
down apply to them, not to `list`.

A post's `format` picks one of `formats/`; without one it's `ranked`.

Every photo post opens on a hook, then the format's own slides. The
sign-up slide (`cta`, below) comes late: in a top 10 (`ranked`, `hottake`)
and `upcoming`, `withCta` in `slides.mjs` drops it in before the last
three or two; a short post puts it at the end instead (tiers add it after
their outro; tips and pairs fold its library plate into the last slide).

The list formats (ranked, hottake, tips) share one slide, `featureSlide`:
the art behind the whole slide, the number in outline across it (the
winner filled), the title, a caption line and one sentence.

- **`ranked`** — `games`, #1 first, one slide each. The original format;
  everything under "Making a new post" below.
- **`hottake`** — a claim and ten games that make the case, counted down.
  `hook`: `mark` (a year or name, set solid across the art of `art`, a game
  entry), `take`, `kicker`, and an optional `label` in place of "Hot
  take" (`""` for none). Each game's blurb is its one line. `outro`:
  `title`, `games` (one to four covers of what the take left out) and
  `body`.
- **`tips`** — something the viewer takes away: tips, habits, mistakes.
  `hook`: `art` (a game entry), `title` (the promise, after the count, which
  is drawn from the number of tips), `kicker`, optional `label`. `tips`:
  five to seven of `{ title, body, art }`, `art` a game the tip applies to.
  `outro`: `title`, `body`, over a hand of the tips' covers.
- **`pairs`** — "if you liked this, play that". `pairs`: six of
  `{ from, to }`, game entries; `to` carries the blurb and gets the slide,
  in the feature layout, with "If you liked" and `from`'s title above its
  name. The hook is a wall of every cover; `outro` (`title`, optional
  `body`) stands on the `to` covers and carries the sign-up plate.
- **`tiers`** — `tiers`, best first: `{ tier: "S", name, note, games }`, two
  to four games a tier, revealed bottom tier first, then the whole board.
  `outro`: `title`, `body`.
- **`upcoming`** — unreleased `games`, sorted by release, each on a calendar
  page with a countdown from the post's `date` (the day it goes out). A game
  IGDB only has a year or month for takes `"date": "2027"` or `"2027-03"`;
  `short` shortens a title for the hook's timeline and the outro's list.

Four formats are videos. They render to `out/<post>/video.mp4` (and a
`cover.png` still) instead of slides, recorded frame by frame from the page
(`record.mjs`), silent, with the sound added in TikTok. They take no `cta`:
an intro card states the quiz and an outro card makes the pitch.

- **`guess`** — `rounds`: eight game entries, easiest first, each with a
  `banner` IGDB screenshot id. The screenshot starts as large blocks and
  only clears when the five-second count ends and the answer shows. Pick
  shots with no logo, HUD or title text, and the subject near the middle:
  the frame is portrait, so a landscape shot loses its sides.
- **`higherlower`** — `rounds`: eight of `{ a, b }`, two game entries whose
  critic scores (IGDB's, from the games table) are compared after a
  five-second think. Ties show as "Same score". Order them so they get
  closer, and check the scores first: IGDB's can differ from the Metacritic
  number people remember.

- **`guessyear`** — `rounds`: eight game entries, each named on screen with
  its art and cover; five seconds to guess, then the year spins up and lands
  with the full date under it. A round's `note` adds a word to the date line
  ("the full release") where the year people remember differs.
- **`whichfirst`** — `rounds`: eight of `{ a, b }`; five seconds to pick,
  then each year spins up with its day and month under it, and the earlier
  is marked "First". The details line shows the developer, never the year.
  Order the pairs so the gaps shrink; the last can be days apart.

`higherlower` and `whichfirst` share their layout and timing
(`formats/versus.mjs`), which compares whatever number a format gives it.
All four take `hook` (`title`, `subtitle`) and `outro` (`title`, `body`).
A video opens on a card that's also its cover: a picture of the quiz above
the title, a ruled "Gaming quiz" label (`hook.label` replaces it) and the
rules as a line of marks. The picture must never give an answer away: guess
the game shows its first screenshots as coarse as each round starts, the
head-to-head formats show the last pair (`hook.pair` picks another) with "?"
for the figures, and guess the year fans out its covers over "19?? or 20??".
The picture shrinks to whatever height the copy leaves.
Release dates come from the games table, the first release anywhere; a game
without an exact date is refused.

Every format's game entries take the same overrides as ranked ones below
(`title`, `developer`, `banner`, `bannerPosition`, `cover`).

## What's been posted

`POSTS.md`, beside `posts/`, is the checklist: every post in the order it
should go out, ticked with its date and link once it's live:

    - [x] [hardest-bosses](posts/hardest-bosses.json) — 2026-11-02 — https://www.tiktok.com/@playratesapp/photo/…

`npm run tiktok` warns about a post that isn't on it. A line scheduled in
TikTok but not live yet ends `— scheduled 2026-11-02 20:33`. Dates on a
line, posted or planned, are what `npm run tiktok:next` treats as taken; an
indented line is an example and isn't read.

## Making a new post (first-run formats)

Start from an existing post of the same format in `posts/`, add it to
`POSTS.md`, and set the fields below; for a ranked post they're the whole
format, and the others share them:

- `tiktok` — what goes in the app with the slides: `title` (90 characters at
  most), `description` (keep it to about five hashtags), `song` and
  `altSong`, `musicSearch` (keywords to search for if neither song is
  available), `pinnedComment` and `when` (the day).

- `hook.title`, `cta.title` — wrap the phrase the post is about in
  `*stars*` to colour it: the whole subject (`The *10 best horror games*`),
  not one word of it. Two separate parts can each take stars
  (`*Original* or *sequel*?`); never the whole headline. Use `\n` to force
  a line break if the wrapping strands a word.
- `games` — **#1 first**, by slug. Remakes and ports share a title, so look
  the slug up rather than guessing it (`resident-evil-2--1` is the 2019
  remake):
  `npx --no-install supabase db query --linked -o csv "select slug, title, release_date from games where igdb_id is not null and title ilike '%resident evil 2%'"`
  (the `igdb_id` filter keeps it on the slug index rather than a full scan).
  `order: "countdown"` shows #10 first so the reveal is the last swipe;
  `"ranked"` shows #1 first.
- `cta` — the sign-up slide: `title`, optional `body` and `kicker` (the
  line over it, "Before the top 3" by default), and `library`, three games
  in the mock library with a status (`played`, `playing`, `backlog`,
  `wishlist`, `finished`) and an optional rating. Pick games already shown,
  so the top isn't spoiled.
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

## Design rules (first-run formats)

What reads as made by a person rather than generated, learned from posts
that didn't. The `list` format goes further and drops the brand entirely:

- **One picture, big type, little else.** A slide is the art, a big number
  or word, a title and one line. A rating meter nobody has filled in, a
  footer, badges and a pull-quote mark all made the slides read as
  generated, and came off in October 2026.
- **No outlined, tinted pills.** A status is its mark and word in the status
  hue (`statusMark`, like the site's `StatusBadge`). A row of pills reads as
  stickers.
- **No buttons.** Nothing on a photo post can be tapped, so the address is a
  line of text with the logo's ember full stop after it (`signoff`).
- **No boxed labels, and no rule or quote mark dressing one.** A label is a
  word in ember ("Hot take"); a dash before it looked templated.
- **Ember in small doses, iris everywhere else.** Ember marks a label, the
  dot in a caption line and the sign-off, as it marks the logo's full stop.
- **Fill the frame.** Art goes edge to edge behind the words; a cover of
  many games is mostly covers. A video's stage is the picture itself, never
  a card in a dark field.
- **Text over art is solid.** Never let art show through lettering or set
  copy over a blurred wash; put the art behind, sharp, and the type on top.
- **A letter in a tile is trimmed to its cap height** (`text-box: trim-both
  cap alphabetic`) and tracked at zero, or it sits off-centre.
- **Grids fill the content width**, or line up with the headline's left
  edge; a narrower grid floating in the column looks misplaced.

## Layout rules

TikTok draws its own UI over a photo post, so everything that has to be read
sits inside `--safe-top`, `--safe-bottom` and `--rail` in `slides.css`: clear
of the tabs at the top, the caption at the bottom and the like/comment column
down the right. Long titles wrap to two lines and push the slide up rather
than down, so the bottom edge stays put.
