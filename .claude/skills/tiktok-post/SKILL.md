---
name: tiktok-post
description: Make PlayRates TikTok posts end to end, one photo slideshow a day at a random time between 19:30 and 21:00 — check the account for posts that went live, pick a tips or top-X topic and its games, write the post file in the plain list format, render and check it, schedule it in TikTok Studio one post at a time, and track it in the posting checklist. Use when asked for a new TikTok post or list, or to prepare, schedule or post one that already exists.
---

# TikTok post

PlayRates posts to TikTok as **@playratesapp**, a personal account. The
account **started again on 2026-10-30**: every earlier post was deleted
after TikTok stopped distributing them on 21 October (the README's
"Starting again" has the numbers). What Callum wants now:

- **Followers first.** 1,000 unlocks a bio link. Entertainment comes before
  sign-ups: no sign-up slide, a light push in the description, the address
  in the bio.
- **Photo slideshows only**, in the `list` format. No videos for now.
- **Extremely simple**: it should look like a person made it in the app,
  not a designer. A picture and TikTok's own text styles, nothing else.
- **Hooks that make people swipe**: tips that benefit the viewer ("6 tips
  for beginners in Elden Ring") or a top X ("Top 10 hardest video game
  bosses of all time").
- **One post a day at a different time each evening**, 19:30 to 21:00
  Estonian time.

The generator lives in `marketing/tiktok/`; read its `README.md` before
writing a post.

- `marketing/tiktok/posts/<name>.json`: one file per post.
- `marketing/tiktok/POSTS.md`: the checklist, posts in posting order,
  marked scheduled, then ticked with date and link once live.
- `marketing/tiktok/out/<name>/`: `slides/` (just the PNGs to upload),
  `contact-sheet.png`, `posting.md` and `description.txt`.

The post files and `POSTS.md` are **local and gitignored**. Never commit
them. Changes to the generator itself are code: commit and push as usual.

## 0. Check the account first

Every run starts here. Open `https://www.tiktok.com/tiktokstudio/content`
in the browser pane. It lists every post with its views; the table is
virtualised, so scroll its scroll box in steps and read the rows as you go.
Then:

- **Tick what went live** in `POSTS.md` with the date and link
  (`a[href*="/video/"]` in the row; TikTok links photo posts as `/video/`
  too).
- **Watch the views.** A healthy post draws hundreds in its first day,
  mostly For You. A post's analytics page
  (`/tiktokstudio/analytics/<id>`) shows the traffic sources; if a run of
  posts sits in single figures with "playratesapp" as the only search,
  distribution has stopped again. Stop posting and tell Callum before
  making anything.
- **The creator comment.** On each post live since the last run, open it
  and read the comments (`[class*="CommentObjectWrapper"]`). If there's no
  comment from the account with the post's `pinnedComment`, post it in the
  "Add comment..." box and read the panel to check it went in once.
  Pinning only works in the app: tell Callum which still need pinning.

## 1. Topic

```bash
npm run tiktok:next
```

prints every post on `POSTS.md` with its hook and games, then the first
free day and a random time in the window. Use that time unless Callum
gives one.

Alternate tips and top-X posts. Read the whole history first: never repeat
a hook, vary the game and genre, and keep any one game from turning up
post after post. Lean on the calendar (horror at Halloween, a big release
day). Aim at games with huge audiences (Minecraft, Elden Ring, GTA,
Fortnite, Pokémon, Souls games) as well as lists that start arguments in
the comments.

- **Tips**: five to seven, each a short `title` (four or five words) and
  one `line` the viewer can act on. Every tip has to be true and
  checkable: write only what you're sure of, and list anything approximate
  for Callum to check.
- **Top X**: usually ten, `countdown: true`, #1 the one people will argue
  about or agree with loudest.

## 2. Games

Look slugs up rather than guessing them; remakes and ports share titles
(`silent-hill-2--1` is the 2024 remake). Filter on `igdb_id`, or the query
scans the table:

```bash
npx --no-install supabase db query --linked -o csv "select slug, title, release_date, igdb_rating_count from games where igdb_id is not null and title ilike '%silent hill%' order by igdb_rating_count desc nulls last"
```

If `npx --no-install` refuses because a newer CLI is out, run a cached one
directly: `~/.npm/_npx/*/node_modules/.bin/supabase`. Prefer the version
with the most ratings. A slug missing from the table can be imported
through the site's admin; don't invent one.

## 3. The post file

Copy an existing `list` post and change everything. The fields are in the
README. Rules:

- **Copy goes to Callum before scheduling**, and never uses an em dash.
- **`hook.text`**: plain words, the way a person would type it. No
  stars, no styling.
- **`line`**: one sentence, about 60 characters at most (the renderer
  warns past two lines). For a top X it can open with the game's name
  ("Elden Ring. Waterfowl Dance...") when the item is a boss, a character
  or anything else that isn't the game itself.
- **`art`**: a game entry with a `banner` IGDB image id chosen by looking
  (section 4). Every slide gets its own picture, even when a tips post is
  all one game.
- **`tiktok.title`**: the hook, plus an emoji if one fits. 90 characters
  at most.
- **`tiktok.description`**: a line that invites a comment, then the push
  in brackets, "(Track your games on our site, playrates.app)", then about
  five hashtags. The account is the site's own (the bio says "from the
  team behind playrates.app"), so the push never says "my" or "I log".
- **`tiktok.time`**: from `npm run tiktok:next`; the renderer refuses a
  time outside 19:30 to 21:00 or off TikTok's five-minute steps.
- **Songs come from games**, both the main pick and the alternative: the
  #1's soundtrack, the game the tips are about, or the genre's best-known
  theme. Never pop songs, edit staples or meme sounds; Callum (2026-10-30):
  "Gamers want songs from games." Say they need checking in the app.
- Add the post to `POSTS.md` in the order it goes out:
  `- [ ] [name](posts/name.json) — planned 2026-11-02 20:33`.

## 4. Pictures, render and check

List a game's IGDB screenshots and artworks with the credentials in
`backend/.env`, and look at them before choosing:

```bash
set -a; . <(grep -E "^IGDB_CLIENT_(ID|SECRET)=" backend/.env); set +a
TOKEN=$(curl -s -X POST "https://id.twitch.tv/oauth2/token?client_id=$IGDB_CLIENT_ID&client_secret=$IGDB_CLIENT_SECRET&grant_type=client_credentials" | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")
curl -s https://api.igdb.com/v4/screenshots -H "Client-ID: $IGDB_CLIENT_ID" -H "Authorization: Bearer $TOKEN" -d "fields image_id; where game = <igdb_id>; limit 14;"
```

Preview at `https://images.igdb.com/igdb/image/upload/t_screenshot_med/<image_id>.jpg`
(a `magick montage` of the candidates, labelled with their ids, is the
quickest way to compare). Artworks are often just the logo; skip those.
None of this touches the RAWG allowance.

A portrait slide keeps only the middle third of a landscape shot. When the
subject is off-centre, set `bannerPosition`: the visible strip starts at
about 0.68 × the percentage, so a subject spanning 37–55% of the width
wants `"45% center"`. Check the real slide, not the contact sheet, for
whether it landed.

```bash
npm run tiktok -- marketing/tiktok/posts/<name>.json
```

A clean run prints **no warnings**. Then read `contact-sheet.png` for what
can't be measured: a blank or muddy crop, a cut-off logo, white text on a
bright sky. The contact sheet is scaled down and can wrap text differently
from the slides, so check doubtful wrapping on the slide PNGs.

Send Callum the contact sheets and the copy, and get his go-ahead before
going to TikTok.

## 5. TikTok Studio

Callum opens TikTok in the browser pane; the upload page is
`https://www.tiktok.com/tiktokstudio/upload`, **Photos** tab.

- **One post at a time, at a person's pace.** The 21 October collapse
  followed fourteen scripted uploads in two hours. Type at normal speed,
  don't hurry between steps, and never queue more than the days Callum has
  asked for in one sitting.
- **Uploading is Callum's job**: the pane can't hand files to TikTok. Open
  the upload page, then ask with AskUserQuestion (one option: "Files are
  uploaded") naming `out/<name>/slides`: Select photos, open the folder,
  Ctrl+A, Open. His click is the go-ahead; don't end the turn to wait.
  Check every slide is in, in order.
- **Title** in "Add a catchy title"; **description** in the box under it.
  Type the description once, then read the box from the page (a screenshot
  can lag) before typing more. Retyping doubles it.
- **Hashtags**: type each one and pick TikTok's exact-match suggestion so it
  becomes a real tag. The suggestions are `.hashtag-suggestion-item`
  elements: pick the one whose first line is exactly the tag and fire
  mousedown/mouseup/click on it, then check each tag sits inside a
  `[class*="mention"]` span. Wait about two seconds after typing a tag
  before picking, or the list still shows the last tag's matches. Some
  tags never match (`#gamingtips`, `#underratedgames`, `#videogames`); use
  the nearest real tag and change the post file to match.
- **Sound**: Add sound under the description, search, then the row's
  **Use** (a real click; it can take a few seconds to apply). Pick the
  original artist's version where there is one (another arrangement by the
  same composer counts), the closest cover of the game track where there
  isn't, and tell Callum which you chose.
- **Schedule** at the post's `time`, Estonian time (the picker's time
  zone), on its day. Pick the Schedule radio, then the date: open the
  date field and click the day's cell at its real coordinates (a scripted
  click on `span.day.valid` didn't take on 2026-10-30). Then the time:
  scroll the page down first so the list has room to open below the field.
  The hour and minute columns
  (`.tiktok-timepicker-time-scroll-container`, 32px rows, minutes in fives)
  ignore clicks and select whatever is centred: a real mouse-wheel tick
  moves about four rows, and a scripted `WheelEvent` on the column with a
  small `deltaY` (±20 to ±64) moves one to three. Read the field after
  each step. Check the inputs read the right date and time before
  scheduling.
- **Near the bottom of the hour list sits the Now radio**: a click that
  misses the list switches the post to Now and the button to Post. Check
  the button still reads Schedule before pressing it.
- **Disclose post content** stays off (Callum's decision, 2026-10-17).
- **Press Schedule yourself** once everything checks out, then wait for
  the page to move to the post list on its own. **Never reload or navigate
  away first**: a reload ten seconds after Schedule lost a post on
  2026-10-30. Confirm it in the post list (`/tiktokstudio/content`), note it in `POSTS.md`
  (`— scheduled 2026-11-02 20:33`) and only then open the next upload.
  Never press **Post**, which publishes now.
- A click that misses can open a photo's preview. Click the dark overlay to
  close it, not Replace or Delete.
- **Deleting** a post can't be undone, so it's Callum's to do, never
  yours. To take a live post down, set it to Private from the row's
  Privacy dropdown only when he asks.

## 6. After posting

Section 0 ticks posts and checks their comments at the start of the next
run. `POSTS.md` is local, so there's nothing to commit. Remind Callum to
pin the comments (only the app can) and to reply to comments in the first
hour.
