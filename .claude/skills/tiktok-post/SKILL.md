---
name: tiktok-post
description: Make a PlayRates TikTok post end to end — pick a format (photo: ranked list, hot take, pairs, tier list, upcoming releases; video: guess the game, higher or lower, guess the year, which came first), choose a topic and its games, write the post file, render and check it, schedule it in TikTok Studio, and track it in the posting checklist. Use when asked for a new TikTok post or ranked list, or to prepare, schedule or post one that already exists.
---

# TikTok post

PlayRates posts to TikTok as **@playratesapp**, a personal account, one post
a day at 21:00 Estonian time: photo slideshows and short quiz videos, about
half and half. The generator lives in `marketing/tiktok/`; read its
`README.md` for the post formats before writing one.

- `marketing/tiktok/posts/<name>.json` — one file per post.
- `marketing/tiktok/POSTS.md` — the checklist: posts in posting order, marked
  scheduled, then ticked with date and link once live.
- `marketing/tiktok/out/<name>/` — rendered output. A photo post has
  `slides/` (just the PNGs to upload) and `contact-sheet.png`; a video post
  has `video.mp4` and `cover.png`. Both have `posting.md`.

The post files and `POSTS.md` are **local and gitignored**. Never commit
them. Changes to the generator itself are code: commit and push as usual.

## 1. Format and topic

```bash
npm run tiktok:next
```

prints every post on `POSTS.md` with its format, hook and games, the first
free day, the video/photo split of the last ten posts, and a suggested
kind and format. Over time posts should be **half video, half slideshow**.
The script never suggests three of one kind in a row, and otherwise
suggests whichever kind the last ten have fewer of.

If Callum names a format, use it. Otherwise decide the kind yourself for
that day, starting from the suggestion: read the whole history, then pick
what will work best on the day. A Friday suits a weekend list, a date near
a big release suits upcoming or a hot take about that series, a quiz suits
a quiet weekday, and a kind that's had several posts in a row is due a
rest. Stay near half and half. Within the kind, the suggested format is a
random one, not the one that kind used last; pick another of the same kind
only for a reason you can name.

Read the whole history before choosing a topic. The same genre or series in
a different format is fine (a ranked RPG list, then an RPG tier list), but
the angle and most of the games should change; never repeat a hook, and keep
any one game from turning up in post after post. Vary genre and angle, and
lean on the calendar when it helps (horror in October, cosy in winter). A
photo post's sign-up slide sells the feature that fits: rating (ranked, hot
take, tiers), the backlog (short games), the wishlist (pairs, upcoming,
hidden gems), friends (co-op). A video's outro card does the same job.

What each format needs from the topic:

- **ranked** — ten games, best first.
- **hottake** — a claim people will argue with but you can defend, and ten
  games that make the case. The hook's `mark` (a year or name) is set solid
  across the art of `art`'s game, so pick art that's bright and sharp near
  its lower half; the outro shows what the take left out.
- **pairs** — six "if you liked X, play Y" with a reason on each thread
  (`why`, short). The Y should be the lesser-known one.
- **tiers** — a series or genre in S/A/B/C, two to four games a tier, with a
  name and a one-line note per tier. A C-tier pick fans will argue about is
  the hook.
- **upcoming** — eight to ten unreleased games, `date` set to the day it
  posts. Anything announced after your knowledge cutoff: read IGDB's summary
  (the `games` endpoint, with the credentials below) before writing about it,
  and give a year-only or month-only release a `date` override ("2027"), as
  IGDB files those under the period's last day. Every release date goes to
  Callum to check.
- **guess** (video) — eight games, easiest first, each with an IGDB
  screenshot that has no logo, HUD or title text and its subject near the
  middle (the frame is portrait). List screenshots and artworks (below) and
  look at them before choosing.
- **higherlower** (video) — eight pairs whose critic scores you've read
  from the games table, getting closer each round; a tie or a surprising
  score late on is the hook. IGDB's scores can differ from the Metacritic
  number people remember, so say so to Callum when one will look wrong.
- **guessyear** (video) — eight well-known games across the decades, in no
  particular year order. Read each date from the games table; where the
  year people remember isn't the first release (Minecraft's full release
  was 2011, its alpha 2009), give the round a `note` saying which it is.
- **whichfirst** (video) — eight pairs from the same era, gaps shrinking
  each round, ending on two releases days or weeks apart (Skyrim beat
  Minecraft by eight days). Work the pairs out from the games table's
  dates, not from memory: memory gets these wrong.

New video formats go in as `demo: true` (see the README) and stay out of
the rotation until Callum has seen a demo and said yes.

Changing or adding slides: follow the design rules in the README (no
outlined pills, light button, no boxed labels, solid type over art, tiles
trimmed to cap height). Callum has turned down each of those once already.

## 2. Games

Look slugs up rather than guessing them; remakes and ports share titles
(`resident-evil-2--1` is the 2019 remake). Filter on `igdb_id`, or the query
scans the table:

```bash
npx --no-install supabase db query --linked -o csv "select slug, title, release_date, critic_score, igdb_rating_count from games where igdb_id is not null and title ilike '%silent hill%' order by igdb_rating_count desc nulls last"
```

If `npx --no-install` refuses because a newer CLI is out, run a cached one
directly: `~/.npm/_npx/*/node_modules/.bin/supabase`.

Prefer the version with the most ratings. A slug that's missing from the
table can be imported through the site's admin; don't invent one.

## 3. The post file

Copy an existing post of the same format and change everything. Rules
learned the hard way:

- **Blurbs**: your own words, about 85 characters at most (two lines; a hot
  take's quote can run to three), and only facts you're sure of. Anything
  approximate (hours to beat, team sizes) goes to Callum as something to
  check.
- **`tiktok.title`**: 90 characters at most (the renderer enforces it).
- **`tiktok.description`**: ends "free at playrates.app" plus about five
  hashtags. No "link in bio": a personal account can't have a bio link until
  1,000 followers. Prefer tags you've seen TikTok match before (the History
  row in the upload page shows them).
- **Songs**: tie the main pick to the #1 (or the list's biggest game) where
  its soundtrack has a well-known track, and give an alternative. Nintendo's
  originals are almost never in TikTok's library, so a Nintendo pick means a
  cover. Say they need checking in the app.
- **`cta.library`** (photo posts) ratings: 0.5–10 in steps of 0.5, as the
  site allows (the renderer refuses anything else). Use games from the
  bottom of the list so the top isn't spoiled. Video posts have no `cta`;
  their `outro` card carries the pitch.
- **Copy that repeats**: check the last post in the same format and don't
  reuse its hook phrasing, title opener, sign-up title or outro title.
- **`tiktok.when`**: the day, with a reason if one suits (a Friday for a
  weekend list, well before Halloween for horror). Every post goes out at
  **21:00 Estonian time**.
- Add the post to `POSTS.md` in the order it should go out.

## 4. Render and check

```bash
npm run tiktok -- marketing/tiktok/posts/<name>.json
```

A photo post: a clean run prints **no warnings**. The warnings cover what
can be measured: copy in TikTok's caption area or under its button rail, a
name cut off, a blurb past its line limit, a post missing from `POSTS.md`.
Fix each one in the post file (shorter copy, a `title`/`developer`/`short`
override, a `\n` in a headline).

Then read `contact-sheet.png` for what can't be measured. Banners are the
usual problem: game HUDs, letterbox bars, washed-out shots, or "artwork"
that turns out to be a giant cropped logo, and in-game text or a "work in
progress" watermark on unreleased games. Swap with `"banner": "artwork"`, or
list the game's IGDB screenshots (or `artworks`) and use an `image_id`:

```bash
set -a; . <(grep -E "^IGDB_CLIENT_(ID|SECRET)=" backend/.env); set +a
TOKEN=$(curl -s -X POST "https://id.twitch.tv/oauth2/token?client_id=$IGDB_CLIENT_ID&client_secret=$IGDB_CLIENT_SECRET&grant_type=client_credentials" | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")
curl -s https://api.igdb.com/v4/screenshots -H "Client-ID: $IGDB_CLIENT_ID" -H "Authorization: Bearer $TOKEN" -d "fields image_id; where game = <igdb_id>; limit 12;"
```

Preview candidates at `https://images.igdb.com/igdb/image/upload/t_screenshot_med/<image_id>.jpg`
before choosing. None of this touches the RAWG allowance.

A video post records `video.mp4` frame by frame (a few minutes of
rendering; it needs ffmpeg). There's no contact sheet: pull frames with
`ffmpeg -ss <seconds> -i video.mp4 -frames:v 1 frame.png` from each round
and check the screenshots and scores as you would banners.

Send Callum the contact sheet and the hook, sign-up, final reveal and outro
slides (or the video), and get his go-ahead before going to TikTok.

## 5. TikTok Studio

Callum opens TikTok in the browser pane; the upload page is
`https://www.tiktok.com/tiktokstudio/upload`. A photo post goes on the
**Photos** tab, a video on **Videos**.

- **Work through a queue without stopping.** Open the upload page on the
  right tab, then ask Callum with AskUserQuestion (one option: "Files are
  uploaded") which files to select. His click is the go-ahead; don't end
  the turn to wait. Uploading is the only part he does: the pane can't hand
  files to TikTok (its content security policy blocks fetching from
  localhost, and the pane won't open a tab a script asks for).
- **Which files**: Select photos, open `out/<name>/slides`, Ctrl+A, Open;
  check every slide is in, in order (the count is in `posting.md`). Or
  Select video, `out/<name>/video.mp4`; TikTok picks the intro card as the
  cover, as `cover.png` shows.
- **Photo post**: the title goes in "Add a catchy title"; the description
  in the box under it.
- **Video post**: there's no title field, and TikTok fills the description
  with the file name ("video"). Wait until the upload has finished (the
  page says "Uploaded"), or TikTok resets the box later and drops what you
  typed. Then ctrl+a, Delete, and type `tiktok.title`, an emoji or a space,
  and `tiktok.description` as one caption.
- **Type the description once**, then check what's in the box (read it
  from the page, not a screenshot, which can lag). Retyping doubles it.
- **Hashtags**: type each one and pick TikTok's exact-match suggestion, so
  it becomes a real tag; a tag left as plain text runs into the next one.
  The suggestions are `.hashtag-suggestion-item` elements: a script can
  pick the one whose first line is exactly the tag and fire
  mousedown/mouseup/click on it, then check each tag sits inside a
  `[class*="mention"]` span. Some tags never match (`#baldursgate3`,
  `#shortgames`, `#underratedgames`, `#videogames`), and long ones often
  get no list (`#upcominggames`, `#gamerecommendations`): backspace to a
  shorter prefix to bring the list back, try the History row under the box,
  or use the nearest real tag (`#underrated`, `#gamingnews`, `#videogame`)
  and change the post file to match.
- **Sound**: on a photo post, Add sound under the description. On a video,
  the **Sounds** button below the preview opens the editor: search, the +
  on a track, then **Save** at the top right; the preview then says
  "Original sound", because the track is mixed in. Pick the original
  artist's version where there is one, the closest cover where there isn't,
  and tell Callum which you chose.
- **Schedule** at **21:00 Estonian time**, the time zone the picker shows.
  A post goes out every day: unless Callum names a date, take the first day
  from today with nothing scheduled in `POSTS.md`; when posts are moved,
  spread the videos evenly among the slideshows. The date cells are
  `span.day.valid` and take a scripted click. The time lists only draw a
  few options at a time and ignore scripted clicks: click real coordinates,
  reading which options are visible inside the list's scroll box before
  each step. Clicking the last visible hour scrolls the list on; clicking
  the first visible minute steps back towards 00. Check the inputs read
  `21:00` and the right date before scheduling.
- **Disclose post content** stays off (Callum's decision, 2026-10-17).
- **Press Schedule yourself** once everything checks out, then confirm the
  date in the post list (`/tiktokstudio/content`; a video shows
  "Processing..." for a minute first), note it in `POSTS.md`
  (`— scheduled 2026-10-22 21:00`) and go straight on to the next post.
  Never press **Post**, which publishes now.
- A click that misses can open a photo's preview. Click the dark overlay to
  close it, not Replace or Delete.
- TikTok's time picker sometimes writes to the clipboard on a synthetic
  click; tell Callum to check his clipboard before pasting.
- **Unscheduling** a post means deleting it from the post list (… → Delete).
  TikTok keeps it in Recently deleted for 30 days. Only on Callum's say-so.

## 6. After posting

When Callum shares the link, tick the post in `POSTS.md` with the date and
the link. It's local, so there's nothing to commit. Remind him to pin the
comment from the post file and to reply to comments in the first hour.
