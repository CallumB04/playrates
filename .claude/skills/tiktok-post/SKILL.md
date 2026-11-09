---
name: tiktok-post
description: Make PlayRates TikTok posts end to end in the handmade format, one photo slideshow a day at a random time between 20:00 and 21:30. Check the account for posts that went live, pick a gaming tips topic that suits a slightly funny, human-made slideshow, confirm the hook, every tip and every joke with Callum before making anything, gather pictures of exactly what each slide talks about, lay the slides out by hand with small asides, captions and stickers, render and check them, schedule them in TikTok Studio one post at a time, and track them in the posting checklist. Use when asked for a new TikTok post or list, or to prepare, schedule or post one that already exists.
---

# TikTok post

PlayRates posts to TikTok as **@playratesapp**, a personal account. The
account **started again on 2026-10-30** after TikTok stopped distributing
the first run (the README's "Starting again" has the numbers), and since
**2026-11-01 every post is handmade**, after a post Kat made by hand (her
original PNGs are `posts/elden-ring-beginner-tips/img/kat-*.png`).
Callum's verdict: "absolutely perfect, and exactly what I want." What he
wants:

- **Followers first.** 1,000 unlocks a bio link. Entertainment comes
  before sign-ups: the push is one last slide and a bracket in the
  description.
- **Photo slideshows only**, in the `handmade` format.
- **Looks made by a person, and a little funny.** Pictures of exactly what
  each slide is about, and a few small jokes on top (below), never more
  than the Elden Ring post has.
- **All gaming tips, since 2026-11-02.** Kat's Elden Ring post drew 3,349
  views and 11 comments on its first day, against about 800 for the posts
  before it. Beginner tips, tips for beating a game or a boss, tips about
  one thing in a game ("5 things you're doing wrong in..."). No top-X
  lists. Each slide needs something to show; a topic with nothing to
  picture is the wrong topic.
- **Callum checks the content first.** Before gathering a single picture,
  send him the hook, every tip (title and line) and every aside and
  caption, and wait for his yes. He knows these games: he cut a tip the
  tutorial already teaches and one that spoiled a later area.
- **One post a day at a different time each evening**, 20:00 to 21:30
  Estonian time.

The generator lives in `marketing/tiktok/`; read its `README.md` first.

- `marketing/tiktok/posts/<name>.json`: the post file (copy, TikTok
  fields, time).
- `marketing/tiktok/posts/<name>/slides.html` and `img/`: the slides, laid
  out by hand on `handmade.css`.
- `marketing/tiktok/POSTS.md`: the checklist, posts in posting order,
  marked scheduled, then ticked with date and link once live.
- `marketing/tiktok/out/<name>/`: `slides/` (just the PNGs to upload),
  `contact-sheet.png`, `posting.md` and `description.txt`.

Posts, their slides and `POSTS.md` are **local and gitignored**. Never
commit them. Changes to the generator, `handmade.css` or this skill are
code: commit and push as usual.

## The format

Read `posts/stardew-beginner-tips/slides.html` and look at Kat's
`posts/elden-ring-beginner-tips/img/kat-*.png` before laying out a new
post; copy the Stardew page and change everything.

- **Hook**: the most recognisable picture of the game there is (key art,
  the title screen, the cover). A see-through white band across it with
  the lead ("6 tips for beginners in") and the **game's real logo**, and
  the PlayRates mark (`.mark`, the site's `favicon.svg`) small in the lower
  left. A post across many games has no logo: put the hook in `.big` type.
  The band must never cover the hook's character or main subject. Keep it
  at its usual height (the default `top`, just above the head, as in the
  Elden Ring, Stardew and Skyrim posts) or lower, never up by the top edge
  where some phones crop it, and move the picture instead: a larger
  `background-size` with `background-position: x 0%` drops the subject
  below the band (Callum, 2026-11-05).
- **Each item**: the band at the top with a big number alternating iris and
  ember (`.num`, `.num.ember`), the title, and one grey line. Behind it a
  picture of **what the tip is about** (the horse for "get your horse", the
  smithing stones for "upgrade your weapon"), never a generic screenshot.
- **Full-bleed pictures by default.** Fill the slide with the picture, and
  move the band rather than covering a face or the thing the tip is about.
  An item band can sit at the top (`top: 262px`) or lower down (up to about
  `top: 1060px`, so its copy stays above y 1540), and the hook band can move
  down too (the RDR2, Elden Ring and Skyrim part 2 hooks sit at `top: 1060px`).
  The hook is always one full picture with the band on it, never a framed
  `.photo` or a blurred backdrop. On the tip slides the blurred backdrop with a `.photo`
  on it (`.bg.soft`) is only for a picture that can't fill a portrait slide well: one or two slides in
  a post at most, never two in a row (Callum, 2026-11-09). Look at every
  slide at full size for a covered face or key object before calling it
  done.
- **What stays the same** across posts is the hook band (lead and logo) and
  the numbered tip bands. Everything on the pictures can be the post's own:
  try a new small idea when it's funny, but don't overdo it.
- **The human bits**, spread out, not on every slide:
  - an `.aside`: a small purple bracket beside the copy ("(Trust me)",
    "(ask me how I know)"), only where it's actually a joke, never as
    decoration. Place each one where it sits naturally in that band, after
    the word it's reacting to or in a gap the copy leaves, never the same
    corner on every slide (Callum, 2026-11-05);
  - a `.cap`: a short white lowercase caption on the picture, tilted, often
    with an `.arrow` doodle pointing at the thing ("evil guy you don't want
    to meet straight away", "me at 1:59am, nowhere near my bed"). The arrow
    has to land exactly on what it points at; check it on the full-size
    slide, not the contact sheet;
  - a `.sticker`: an item sprite or cutout dropped on the picture (carrots
    on Torrent, strawberries at the Egg Festival), with `.spark` glows now
    and then.
  Jokes stay gentle and about the game. Puns are welcome. Kat's Elden
  Ring post is the ceiling: two asides, three captions and one sticker
  across six tips. A sticker that shows the item a tip names (the Quill,
  the markers) is a picture, not a joke.
- **Last slide**: "Now you're ready for [logo]", then the purple push with
  the address set as `<span class="url">playrates.app</span>`, an ember
  aside inside the band ("(pretty please!!!)"), and the mark with two
  sparks under the band.

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
  and read the comments (`[class*="CommentObjectWrapper"]`; the panel only
  shows with the tab at least 1280px wide, so `resize_window` first and
  open its Comments tab). If there's no
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

Read the whole history first: never repeat a hook, vary the game and genre,
and keep any one game from turning up post after post. Vary the kind of
tips too. Lean on the calendar (horror at Halloween, a big release day). Aim
at games with huge audiences (Minecraft, Elden Ring, GTA, Fortnite,
Pokémon, Skyrim, Stardew) as well as lists that start arguments in the
comments. Before settling on one, sketch each slide's picture and its joke;
if three slides have neither, pick another topic.

Five to eight tips (not always six), each a short `title` (four or five
words) and one `line` the viewer can act on. A good five beats a forced
eight: never pad a list. Boss guides only for bosses known to be hard
(Tree Sentinel, Malenia, Maliketh, Radahn), not ones like Margit. No trivia
that helps nobody ("the game can pause"). No game Callum hasn't played
and can't check (Baldur's Gate 3 for now). Even a beginner post needs
tips most players don't already know: on 2026-11-02 Callum pulled a Minecraft post of "don't dig
straight down, sleep the first night" basics. Every tip has to be true and
checkable: write only what you're sure of, and list anything approximate
for Callum to check. Skip what the game's tutorial already teaches, and
anything that spoils the story, an area or a boss a beginner hasn't
reached (track and file names can spoil too). Before proposing, go through
every tip asking "would a player learn this in the first few minutes?":
Callum cut two Silksong tips (Bind heals, Hornet pogos diagonally) as
first-minute knowledge. Fans of a series like a nod to the earlier games
where one fits: Shakra's singing next to Cornifer's humming, Andre turning
up again in Dark Souls III.

Then send Callum the hook, the six tips and the jokes, and build nothing
until he says go. Once he has, fact-check every tip against sources (a
research agent with web search, a wiki and a guide per claim) before
gathering pictures. The RDR2 check found three of six lines wrong or
misleading. Bring any change back to him before it goes on a slide; he
hasn't played every game and relies on this.

## 2. Games

Look slugs up rather than guessing them; remakes and ports share titles
(`silent-hill-2--1` is the 2024 remake). Filter on `igdb_id`, or the query
scans the table:

```bash
npx --no-install supabase db query --remote --read-only -o csv "select slug, title, release_date, igdb_rating_count from games where igdb_id is not null and title ilike '%silent hill%' order by igdb_rating_count desc nulls last"
```

If `npx --no-install` refuses because a newer CLI is out, run a cached one
directly: `~/.npm/_npx/*/node_modules/.bin/supabase`. The slugs only feed
the history (`art: { "slug": ... }` on the hook and each item); the
pictures come from section 4.

## 3. The post file

`"format": "handmade"`. Copy `posts/stardew-beginner-tips.json`. Rules:

- **Copy goes to Callum before scheduling**, and never uses an em dash.
  That includes every aside and caption.
- **`hook.text`**: the hook as a sentence ("6 tips for beginners in
  Stardew Valley"), for the history.
- **`items`**: `{ title, line, art: { slug } }`, in slide order. The
  renderer warns when a title or line isn't on the slides word for word, so
  change both together.
- **`line`**: one sentence, about 60 characters at most.
- **`tiktok.title`**: the hook, plus an emoji if one fits. 90 characters
  at most.
- **`tiktok.description`**: a line that invites a comment, then the push
  in brackets, "(Track your games on our site, playrates.app)", then about
  five hashtags. The account is the site's own (the bio says "from the
  team behind playrates.app"), so the push never says "my" or "I log".
- **`tiktok.time`**: from `npm run tiktok:next`; the renderer refuses a
  time outside 20:00 to 21:30 or off TikTok's five-minute steps.
- **Songs come from games**, both the main pick and the alternative: the
  #1's soundtrack, the game the tips are about, or the genre's best-known
  theme. Never pop songs, edit staples or meme sounds; Callum (2026-10-30):
  "Gamers want songs from games." The sound has to be recognisable from
  the first second: the theme people know, already playing at full
  volume. It doesn't have to be hype (Stardew's overture and Minecraft's
  Sweden work), but a slow intro loses the swipe (Dark Souls' title theme
  and Hollow Knight's main theme did, 2026-11-02). Studio's picker can't
  choose where a song starts, so pick tracks that open on the melody.
- Add the post to `POSTS.md` in the order it goes out:
  `- [ ] [name](posts/name.json) — planned 2026-11-02 20:35`.

## 4. Pictures, slides, render and check

Every picture goes in `posts/<name>/img/`. Where to find them:

- **Key art and screenshots**: IGDB, with the credentials in
  `backend/.env` (none of this touches the RAWG allowance):

  ```bash
  set -a; . <(grep -E "^IGDB_CLIENT_(ID|SECRET)=" backend/.env); set +a
  TOKEN=$(curl -s -X POST "https://id.twitch.tv/oauth2/token?client_id=$IGDB_CLIENT_ID&client_secret=$IGDB_CLIENT_SECRET&grant_type=client_credentials" | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")
  curl -s https://api.igdb.com/v4/artworks -H "Client-ID: $IGDB_CLIENT_ID" -H "Authorization: Bearer $TOKEN" -d "fields image_id,width,height; where game = <igdb_id>; limit 30;"
  ```

  Full size at `https://images.igdb.com/igdb/image/upload/t_original/<image_id>.jpg`.
- **The game's logo**: Steam's library logo,
  `https://cdn.cloudflare.steamstatic.com/steam/apps/<appid>/logo.png`,
  trimmed with `magick logo.png -trim +repage`. A white one won't read on
  the band; find a dark or coloured version or recolour it.
- **The exact thing a slide talks about** (an item, a boss, a menu, a
  character) and **stickers**: the game's wiki. Fandom wikis, UESP,
  minecraft.wiki and stardewvalleywiki.com all answer the MediaWiki API with
  a browser User-Agent: `api.php?action=parse&page=<Page>&prop=images&format=json`
  lists a page's pictures, and `action=query&titles=File:<name>&prop=imageinfo&iiprop=url|size&format=json`
  gives their URLs. Stickers need real transparency
  (`magick identify -format '%[opaque]'`); item sprites usually have it.

Look at every candidate before choosing (`magick a b c -resize x300 +append`
and read the result; `montage` errors on fonts without `-label ''`).
Pixel art scales crisp with `.px`. A portrait slide shows only the middle
third of a landscape picture: aim it with `background-position` and
`background-size: auto <height>px` to zoom.

Lay the slides out in `posts/<name>/slides.html`, one `<section
class="slide" data-name="...">` each. Keep anything that has to be read
above y 1540 and left of x 940, clear of TikTok's caption and rail.

```bash
npm run tiktok -- marketing/tiktok/posts/<name>.json
```

A clean run prints **no warnings**. Then look at the slides themselves,
not only the contact sheet: a caption on a light patch, an aside sitting
on the copy, a sticker over the subject, an arrow pointing at nothing.

Send Callum the contact sheets and the copy (asides and captions included),
and get his go-ahead before going to TikTok.

## 5. TikTok Studio

Callum opens TikTok in the browser pane; the upload page is
`https://www.tiktok.com/tiktokstudio/upload`, **Photos** tab.

- **One post at a time, at a person's pace.** The 21 October collapse
  followed fourteen scripted uploads in two hours. Type at normal speed,
  don't hurry between steps, and never queue more than the days Callum has
  asked for in one sitting. Leave 15 minutes between one post's Schedule
  and the next upload.
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
  tags never match (`#gamingtips`, `#underratedgames`, `#videogames`,
  `#eldenringtips`); use the nearest real tag and change the post file to
  match. A tag with no match stays as plain text and the next tag runs into
  it: put the caret after it with a Selection range and press Backspace
  over it before typing on.
- **Sound**: Add sound under the description, search, then the row's
  **Use** (a real click; it can take a few seconds to apply; when a real click
  doesn't take, `.click()` on the row's Use button from a script does). Pick the
  original artist's version where there is one (another arrangement by the
  same composer counts), the closest cover of the game track where there
  isn't. You can't hear audio, so Callum chooses: open the picker on your
  search, list the rows with your recommendation first, and ask him to
  preview them (each row has a play button) before you click Use.
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
- **All of this works by script, even with the pane hidden** (2026-10-30):
  `input[value=schedule]`.click(); open a picker by firing
  pointerdown/mousedown/pointerup/mouseup/click on the field's
  `.TUXInputBox`; the date's `span.arrow` (second is next month) and
  `span.day.valid` take the same five events; step the time with a
  `WheelEvent` of `deltaY` ±20 per row, reading the `input` values after
  each; then click the `button` whose text is "Schedule".
- **Near the bottom of the hour list sits the Now radio**: a click that
  misses the list switches the post to Now and the button to Post. Check
  the button still reads Schedule before pressing it.
- **Disclose post content** stays off (Callum's decision, 2026-10-17).
- **Press Schedule yourself** once everything checks out, then wait for
  the page to move to the post list on its own. **Never reload or navigate
  away first**: a reload ten seconds after Schedule lost a post on
  2026-10-30. Confirm it in the post list (`/tiktokstudio/content`; the
  list it lands on can lag, so if the post is missing, reload it then, never
  schedule again),
  **including the description**: on 2026-10-30 a post scheduled with a
  correct-looking box arrived as "No description", and **scheduled posts
  can't be edited**, so the only fix is for Callum to delete it and for
  you to redo it. Check the row's text right after every Schedule, note it in `POSTS.md`
  (`— scheduled 2026-11-02 20:33`) and only then open the next upload.
  Never press **Post**, which publishes now.
- A click that misses can open a photo's preview. Click the dark overlay to
  close it, not Replace or Delete.
- **Deleting** a live post is Callum's to do, never yours. To take a live
  post down, set it to Private from the row's Privacy dropdown only when he
  asks. A post that's only scheduled can't be edited, so changing its
  sound or copy means unscheduling it: when he asks, open the row's ⋯
  (the `button` after its Privacy button), check the menu opened inside
  that row, Delete, and confirm. It goes to Recently deleted for 30 days
  and the files are local; then post it again as new.

## 6. After posting

Section 0 ticks posts and checks their comments at the start of the next
run. `POSTS.md` is local, so there's nothing to commit. Remind Callum to
pin the comments (only the app can) and to reply to comments in the first
hour.
