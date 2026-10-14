---
name: tiktok-post
description: Make a PlayRates TikTok slideshow post end to end — choose a ranked-list topic and its ten games, write the post file, render and check the slides, prepare it in TikTok Studio up to the Post button, and track it in the posting checklist. Use when asked for a new TikTok post or ranked list, or to prepare or post one that already exists.
---

# TikTok post

PlayRates posts ranked-list photo slideshows to TikTok as **@playratesapp**,
a personal account. The generator lives in `marketing/tiktok/`; read its
`README.md` for the full post format before writing one.

- `marketing/tiktok/posts/<name>.json` — one file per post.
- `marketing/tiktok/POSTS.md` — the checklist: posts in posting order, ticked
  with date and link once live.
- `marketing/tiktok/out/<name>/` — rendered output; `slides/` holds just the
  PNGs to upload, `contact-sheet.png` shows all twelve at once.

The post files and `POSTS.md` are **local and gitignored**. Never commit
them. Changes to the generator itself are code: commit and push as usual.

## 1. Topic

Read `POSTS.md` first, so a new post doesn't repeat one. Vary the genre and
the angle (best ever, short games, hidden gems, co-op, a series ranked), and
lean on the calendar when it helps (horror in October, cosy in winter). The
sign-up slide should sell the PlayRates feature that fits the topic: rating
(best-of lists), the backlog (short games), the wishlist (hidden gems),
friends (co-op).

## 2. Games

Ten games, **#1 first** in the file. Look slugs up rather than guessing them;
remakes and ports share titles (`resident-evil-2--1` is the 2019 remake).
Filter on `igdb_id`, or the query scans the table:

```bash
npx --no-install supabase db query --linked -o csv "select slug, title, release_date, critic_score, igdb_rating_count from games where igdb_id is not null and title ilike '%silent hill%' order by igdb_rating_count desc nulls last"
```

If `npx --no-install` refuses because a newer CLI is out, run a cached one
directly: `~/.npm/_npx/*/node_modules/.bin/supabase`.

Prefer the version with the most ratings. A slug that's missing from the
table can be imported through the site's admin; don't invent one.

## 3. The post file

Copy an existing post and change everything. Rules learned the hard way:

- **Blurbs**: your own words, about 85 characters at most (two lines), and
  only facts you're sure of. Anything approximate (hours to beat, team sizes)
  goes to Callum as something to check.
- **`tiktok.title`**: 90 characters at most (the renderer enforces it).
- **`tiktok.description`**: ends "free at playrates.app" plus about five
  hashtags. No "link in bio": a personal account can't have a bio link until
  1,000 followers.
- **Songs**: tie the main pick to the #1 game where its soundtrack has a
  well-known track, and give an alternative. Say they need checking in the
  app; what's available there can't be seen from here.
- **`cta.library`** ratings: 0.5–10 in steps of 0.5, as the site allows (the
  renderer refuses anything else). Use games from the bottom of the list so
  the top isn't spoiled.
- **`tiktok.when`**: the day only, if one suits (a Friday for a weekend
  list, well before Halloween for horror). Every post goes out at **21:00
  Estonian time**.
- Add the post to `POSTS.md` in the order it should go out.

## 4. Render and check

```bash
npm run tiktok -- marketing/tiktok/posts/<name>.json
```

A clean run prints **no warnings**. The warnings cover what can be
measured: copy in TikTok's caption area or under its button rail, a name cut
off, a blurb past two lines, a post missing from `POSTS.md`. Fix each one in
the post file (shorter copy, a `title`/`developer` override, a `\n` in a
headline).

Then read `contact-sheet.png` for what can't be measured. Banners are the
usual problem: game HUDs, letterbox bars, washed-out shots, or "artwork"
that turns out to be a giant cropped logo. Swap with `"banner": "artwork"`,
or list the game's IGDB screenshots and use an `image_id`:

```bash
set -a; . <(grep -E "^IGDB_CLIENT_(ID|SECRET)=" backend/.env); set +a
TOKEN=$(curl -s -X POST "https://id.twitch.tv/oauth2/token?client_id=$IGDB_CLIENT_ID&client_secret=$IGDB_CLIENT_SECRET&grant_type=client_credentials" | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")
curl -s https://api.igdb.com/v4/screenshots -H "Client-ID: $IGDB_CLIENT_ID" -H "Authorization: Bearer $TOKEN" -d "fields image_id; where game = <igdb_id>; limit 12;"
```

Preview candidates at `https://images.igdb.com/igdb/image/upload/t_screenshot_med/<image_id>.jpg`
before choosing. None of this touches the RAWG allowance.

Send Callum the contact sheet and the hook, sign-up and #1 slides, and get
his go-ahead before going to TikTok.

## 5. TikTok Studio

Callum opens TikTok in the browser pane. On the upload page, choose the
**Photos** tab.

- **Uploading is his step.** The pane can't hand files to TikTok: its
  content security policy blocks fetching from localhost, and the pane won't
  open a tab a script asks for. Ask him to click Select photos, open
  `marketing/tiktok/out/<name>/slides`, press Ctrl+A and Open. Check that
  all twelve are in, in order.
- **Title** goes in the "Add a catchy title" field.
- **Description**: click into the box and type it once, then check the
  character counter before doing anything else. Screenshots can lag behind
  what was typed, and retyping doubles it. To start again: ctrl+a, Delete.
- **Hashtags**: type each one and click TikTok's exact-match suggestion, so
  it becomes a real tag. Some tags have no match (`#baldursgate3`,
  `#shortgames`), and a long tag sometimes gets no list at all: backspace
  to a short prefix, pick the nearest real tag, and update the post file to
  match. A tag left as plain text runs into the next one.
- **Sound**: Add sound, search the track, pick the original artist's
  version, and tell Callum which version you chose so he can preview it.
- **Schedule** every post for **21:00 Estonian time**, the time zone the
  picker shows. Unless Callum names a date, take the next day that leaves a
  day clear after the last scheduled post in `POSTS.md`. In the time picker,
  click the hour, then keep clicking the topmost minute until 00 shows and
  click that; scrolling moves one step at a time. Check the inputs read
  `21:00` and the right date, then note it in `POSTS.md`:
  `— scheduled 2026-10-22 21:00`.
- A click that misses can open a photo's preview. Click the dark overlay to
  close it, not Replace or Delete.
- Leave **Disclose post content** for Callum to decide. The post promotes
  PlayRates, and TikTok may expect it on with "Your brand".
- **Stop before Post or Schedule.** Callum presses it himself.

## 6. After posting

When Callum shares the link, tick the post in `POSTS.md` with the date and
the link. It's local, so there's nothing to commit. Remind him to pin the
comment from the post file.
