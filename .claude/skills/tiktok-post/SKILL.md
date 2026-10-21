---
name: tiktok-post
description: Make PlayRates TikTok posts end to end, one a day at 21:00, alternating slideshows and videos — check the account for posts that went live, pick a format (photo: ranked list, hot take, tips, pairs, tier list, upcoming releases; video: guess the game, higher or lower, guess the year, which came first), choose a topic and its games, write the post file, render and check it, schedule it in TikTok Studio, and track it in the posting checklist. Use when asked for a new TikTok post or ranked list, or to prepare, schedule or post one that already exists.
---

# TikTok post

PlayRates posts to TikTok as **@playratesapp**, a personal account, **one
post a day at 21:00 Estonian time**. From 2026-10-22 the mix Callum wants
is **60/40 slideshows to videos**, and **60/40 posts that benefit the viewer
(tips, mistakes, habits) to fun ones (rankings, hot takes, tier lists,
quizzes)**: over any five days, three of each majority. Videos are on trial;
he may drop them if they don't land.
A 16:00 slot was tried for three days in October 2026 and dropped: those
posts drew 5–10 views against 500–600 in the evening, and Callum didn't
want them on the profile. Mix the newer "useful to the viewer" formats in
between the fun ones to see what lands (section 1).

Make one post for the first free day unless Callum asks for a batch. The
generator lives in `marketing/tiktok/`; read its `README.md` for the post
formats and design rules before writing one.

- `marketing/tiktok/posts/<name>.json` — one file per post.
- `marketing/tiktok/POSTS.md` — the checklist: posts in posting order, marked
  scheduled, then ticked with date and link once live.
- `marketing/tiktok/out/<name>/` — rendered output. A photo post has
  `slides/` (just the PNGs to upload) and `contact-sheet.png`; a video post
  has `video.mp4` and `cover.png`. Both have `posting.md`.

The post files and `POSTS.md` are **local and gitignored**. Never commit
them. Changes to the generator itself are code: commit and push as usual.

## 0. Check the account first

Every run starts here, before making anything. Open
`https://www.tiktok.com/@playratesapp` in the browser pane and read the
post links from the page (`a[href*="/video/"], a[href*="/photo/"]`; the
grid takes a few seconds to load, and it also links other accounts' videos,
so keep the ids that appear more than once or open each one). Then:

- **Tick what went live.** Match each post to its line in `POSTS.md` by the
  caption (the page title starts with it) and tick it with the date and
  link: `- [x] [best-rpgs](posts/best-rpgs.json) — 2026-10-18 — https://www.tiktok.com/@playratesapp/photo/…`.
- **Check the comment.** On each post live since the last run, open the
  **Comments** tab beside the post and read the comments
  (`[class*="CommentObjectWrapper"]`). If there's no comment from
  "PlayRates / Game Rankings · Creator" with the post's `pinnedComment`,
  post it yourself in the "Add comment..." box at the bottom of the panel
  (Callum asked for this, 2026-10-19). Read the panel afterwards to check
  it went in once.
- **Pinning can't be done on the web**: the comment's … menu only offers
  Delete. Tell Callum which posts' comments still need pinning in the app.

## 1. Formats and topics

```bash
npm run tiktok:next
```

prints every post on `POSTS.md` with its format, hook and games, then the
first free day and a suggestion: the other kind from the last post and a
format of that kind. The script only alternates; hold it to the 60/40 mixes
above yourself, looking at the last five posts.

If Callum names a format, use it. Otherwise decide yourself, starting from
the suggestion: read the whole history, then pick what will work best on
the day. A Friday suits a weekend list, a date near a big release suits
upcoming or a hot take about that series, and a format that's had several
posts in the last week is due a rest. The suggested format is a random one
of its kind, not the one that kind used last; pick another of the same kind
only for a reason you can name. Avoid two of the same format on
consecutive days where the mix allows.

**Recommendations count as benefit.** A list that tells the viewer what to
play (co-op, short games, cosy, "if you liked X" pairs) is on the benefit
side with tips; best-of rankings, hot takes, tier lists and the quizzes are
fun (Callum, 2026-10-21). Plans run ten days at a time, then Callum reviews
what's working before the next batch: don't keep a long list of ideas.

**Give the viewer something.** A list of games with no point to it is the
weakest kind of post. Every few posts should promise the viewer a benefit
in the hook, and the `tips` format exists for these:

- a pain point: "7 habits making you worse at Souls games"
- advice: "5 things to do first in Baldur's Gate 3"
- insider knowledge: "6 settings nobody tells you to change"
- surprise: "5 weird tricks that make you better at shooters"

Mix and match these with the fun formats (rankings, hot takes, quizzes).
Every tip has to be true and checkable: write only what you're sure of, and
list anything approximate for Callum to check.

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
  its lower half; the outro shows what the take left out. Its cover is the
  strongest we have (the 2017, GTA V and PS2 posts): big words over a big
  picture. Use it as the model for every cover.
- **tips** — five to seven tips, habits or mistakes, each with a short
  `title` (five words or so), a one-sentence `body`, and `art`: a game it
  applies to, shown big behind the tip. The hook's number is the count.
- **pairs** — six "if you liked X, play Y". The Y should be the
  lesser-known one, and gets the slide; X is the line above its name.
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

Changing or adding slides: follow the design rules in the README. Callum
has turned each of those down once already. The short version, from his
review of the first two weeks (2026-10-21):

- **One big picture, big type, little else.** The 2017 hot take's slides
  are the reference: art behind the whole slide, the number huge, the title,
  one line. Too much on screen at once reads as AI-made.
- **No "Your rating" meter** on the list slides; the viewer hasn't rated
  anything. The content does the work; the pitch comes later.
- **The sign-up slide comes late**, never second, where it drove people
  off. In a long post (a top 10, eight or more items) it goes in front of
  the top 3 ("Before the top 3"). A short post (tips, pairs, a tier list)
  has no sign-up slide in the middle: tips fold it into the last slide, the
  others add it at the end. Its address is a line of text, not a button:
  nothing on a photo post can be tapped.
- **No em-dash rules or quote marks** dressing a label ("— Hot take"): a
  word in ember is enough.
- **Ember in small doses**, as in the logo's full stop: a label, a dot, the
  sign-off. Iris stays the main colour, and its shade never changes: it's
  the brand's. Where iris text struggles on bright art, darken what's behind
  it instead.
- **Fill the frame.** Covers of a collection of games should be mostly
  covers, not black; videos put the picture edge to edge (guess the game
  does), never a small card on a dark stage. Check the cover at 1.2s for
  anything that sinks into the picture, and deepen the shade if it does.
- **A video's cover shows the game being played.** The remakes cover is
  the model: the two games side by side, "or" between them, the art running
  the full height and fading out under the words. Guess the game shows its
  first screenshots a step clearer each; guess the year shows a round with
  the year still blank.
- **A video's ending is the one pitch.** It stands on a wall of the
  video's covers with the logo set large, never words on black.

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

- **Blurbs**: one sentence in your own words, about 70 characters at most
  (two lines at the slide's size), and only facts you're sure of. Anything
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
- **`cta`** (photo posts): `title`, an optional `body`, `library` (three
  games with a status and an optional rating, 0.5–10 in steps of 0.5; the
  renderer refuses anything else), and `kicker`, the line that sets the
  moment ("Before the top 3" by default). Use library games already shown,
  so the top isn't spoiled. Video posts have no `cta`; their `outro` card
  carries the pitch over a hand of the round's covers.
- **The coloured words**: `*stars*` in a headline go round the phrase the
  post is about, the whole of it: `The *10 best horror games*`, not
  `The 10 best *horror* games`. Two parts can each take stars (`*Original*
  or *sequel*?`), but never the whole headline.
- **A video's opening card is its cover**, so it has to stop the scroll
  without answering anything. Each format draws its own picture for it
  (see the README); check the frame at 1.2 seconds before recording, and
  keep `hook.subtitle` to the rules people need ("Eight rounds, five
  seconds each").
- **Copy that repeats**: check the last post in the same format and don't
  reuse its hook phrasing, title opener, sign-up title or outro title.
- **`tiktok.when`**: the day, with a reason if one suits (a Friday for a
  weekend list, well before Halloween for horror). Every post goes out at
  **21:00 Estonian time**.
- Add the post to `POSTS.md` in the order it goes out.

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
  typed; it can still do so a second or two after. Then ctrl+a, Delete, and
  type the "Caption" from `posting.md`, which puts a full stop after a
  title that needs one.
- **Type the description once**, then check what's in the box (read it
  from the page, not a screenshot, which can lag). Retyping doubles it.
  If the reset lands after the hashtags, the box keeps the tags and drops
  the text: focus it, ctrl+Home, and type the caption in front of them.
- **Hashtags**: type each one and pick TikTok's exact-match suggestion, so
  it becomes a real tag; a tag left as plain text runs into the next one.
  The suggestions are `.hashtag-suggestion-item` elements: a script can
  pick the one whose first line is exactly the tag and fire
  mousedown/mouseup/click on it, then check each tag sits inside a
  `[class*="mention"]` span. Wait about two seconds after typing each tag
  before picking: the list still shows the last tag's matches for a moment,
  and a pick from it drops the tag without an error. Some tags never match (`#baldursgate3`, `#gamingtips`, `#gamingtip`,
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
- **Schedule** at **21:00 Estonian time** (the time zone the picker shows)
  on its day. Unless Callum names a date, that's the first day from today
  with nothing scheduled in `POSTS.md`. When posts are moved, keep photos
  and videos alternating. The date cells are
  `span.day.valid` and take a scripted click. The time lists only draw a
  few options at a time and ignore scripted clicks: click real coordinates,
  reading which options are visible inside the list's scroll box before
  each step. Clicking the last visible hour scrolls the list on; clicking
  the first visible minute steps back towards 00. Check the inputs read
  the post's time and the right date before scheduling.
- **Disclose post content** stays off (Callum's decision, 2026-10-17).
- **A video's content check** has to finish ("No issues found") before
  Schedule. Pressed sooner, TikTok asks "Continue to post?" with a **Post
  now** button: Cancel, never Post now. If the check says "Something went
  wrong", press its Retry; a check stuck for over ten minutes in a
  background tab usually turns out to have failed. While one waits, open the
  next post in a second tab (`tabs_create`), front it for Callum's upload,
  and come back.
- **Near the bottom of the hour list sits the Now radio**: a click that
  misses the list switches the post to Now and the button to Post. Check
  the button still reads Schedule before pressing it.
- **Press Schedule yourself** once everything checks out, then confirm the
  date in the post list (`/tiktokstudio/content`; a video shows
  "Processing..." for a minute first), note it in `POSTS.md`
  (`— scheduled 2026-10-22 21:00`) and go straight on to the next post.
  Never press **Post**, which publishes now.
- A click that misses can open a photo's preview. Click the dark overlay to
  close it, not Replace or Delete.
- TikTok's time picker sometimes writes to the clipboard on a synthetic
  click; tell Callum to check his clipboard before pasting.
- **Unscheduling** a post means deleting it from the post list: hover the
  row's … (a real hover after a click; scripted hovers don't open it), then
  Delete, then Delete in "Delete post?". TikTok says it can't be recovered,
  so only on Callum's say-so, and only for a post whose files are still in
  `out/`. A post that's already **live** is never deleted, because its views
  and comments go with it: set it to **Private** from the row's Privacy
  dropdown instead, and leave deleting it to Callum.

## 6. After posting

Section 0 ticks posts and checks their comments at the start of the next
run. If Callum shares a link sooner, tick that post then. `POSTS.md` is
local, so there's nothing to commit. Remind him to pin the comments (only
the app can) and to reply to comments in the first hour.
