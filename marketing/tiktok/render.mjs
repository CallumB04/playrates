/**
 * Renders a TikTok slideshow from a post file: a hook, a sign-up slide, then
 * one slide per game, as 1080x1920 PNGs ready to upload as a photo post.
 *
 *   npm run tiktok -- marketing/tiktok/posts/best-horror-games.json
 *   npm run tiktok -- <post> --html     # write the page only, no PNGs
 *
 * Game details and art come from the games table, read with backend/.env as
 * the backend's own scripts are (the table isn't open to the anon key), and
 * from IGDB's image CDN, so a post costs no RAWG requests.
 */
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderPost } from "./slides.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../..");

const [postPath, ...flags] = process.argv.slice(2);
if (!postPath) {
  console.error("usage: npm run tiktok -- <post.json> [--html]");
  process.exit(1);
}
const htmlOnly = flags.includes("--html");

const post = JSON.parse(await readFile(path.resolve(postPath), "utf8"));
const name = path.basename(postPath, ".json");
const outDir = path.join(here, "out", name);
const imgDir = path.join(outDir, "img");

const readEnv = async (file) =>
  Object.fromEntries(
    (await readFile(file, "utf8"))
      .split("\n")
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")]),
  );

const env = await readEnv(path.join(root, "backend/.env"));
const supabaseUrl = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const fetchGames = async (slugs) => {
  const url = new URL("/rest/v1/games", supabaseUrl);
  url.searchParams.set(
    "select",
    "slug,title,release_date,critic_score,developers,box_art_url,cover_url,banner_url",
  );
  url.searchParams.set("slug", `in.(${slugs.join(",")})`);
  // The slug index is partial on igdb_id; without this the lookup scans the
  // whole table and can hit the statement timeout.
  url.searchParams.set("igdb_id", "not.is.null");
  const response = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok)
    throw new Error(`games: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const missing = slugs.filter((slug) => !bySlug.has(slug));
  if (missing.length)
    throw new Error(`no game with slug: ${missing.join(", ")}`);
  return bySlug;
};

/** IGDB serves any size from the same id; the stored URLs are sized for the
 *  site, and a 1080px slide wants the larger one. */
const igdbSize = (url, size) => url?.replace(/\/t_[a-z0-9_]+\//, `/t_${size}/`);

/** A post can swap a game's art for "artwork" (the IGDB key art the site
 *  stores in cover_url), a bare IGDB image id, or any URL. */
const igdbImage = (value, row) =>
  value === undefined
    ? undefined
    : value === "artwork"
      ? row.cover_url
      : /^[a-z0-9]+$/.test(value)
        ? `https://images.igdb.com/igdb/image/upload/t_1080p/${value}.jpg`
        : value;

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

/** Downloads once per post and points the page at the local copy, so a
 *  re-render while tweaking the copy doesn't hit the CDN again. */
const localImage = async (url) => {
  const { pathname } = new URL(url);
  const target = path.join(
    imgDir,
    `${path.basename(path.dirname(pathname))}-${path.basename(pathname)}`,
  );
  if (!(await exists(target))) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
  }
  return `img/${path.basename(target)}`;
};

// The mock library should only show a rating the site would accept: 0.5-10
// in steps of 0.5, as RatingSchema in shared/src/schemas/gameLog.ts.
for (const { slug, rating } of post.cta.library ?? []) {
  if (
    rating !== undefined &&
    !(rating >= 0.5 && rating <= 10 && Number.isInteger(rating * 2))
  ) {
    throw new Error(`${slug}: rating ${rating} isn't 0.5-10 in steps of 0.5`);
  }
}

const librarySlugs = (post.cta.library ?? []).map((entry) => entry.slug);
const rows = await fetchGames([
  ...new Set([...post.games.map((g) => g.slug), ...librarySlugs]),
]);

await mkdir(imgDir, { recursive: true });
await mkdir(path.join(outDir, "fonts"), { recursive: true });

const toGame = async (slug, extra = {}) => {
  const row = rows.get(slug);
  const cover =
    igdbImage(extra.cover, row) ??
    igdbSize(row.box_art_url ?? row.cover_url, "1080p");
  const banner =
    igdbImage(extra.banner, row) ?? row.banner_url ?? row.cover_url;
  if (!banner)
    throw new Error(`${slug} has no banner; set "banner" on it in the post`);
  return {
    slug,
    title: extra.title ?? row.title,
    releaseDate: row.release_date,
    criticScore: row.critic_score,
    developer: extra.developer ?? row.developers?.[0],
    stat: extra.stat,
    blurb: extra.blurb ?? "",
    bannerPosition: extra.bannerPosition ?? "center",
    cover: await localImage(cover),
    banner: await localImage(igdbSize(banner, "1080p")),
  };
};

const games = await Promise.all(
  post.games.map((entry) => toGame(entry.slug, entry)),
);
const library = await Promise.all(
  (post.cta.library ?? []).map(async (entry) => ({
    ...entry,
    game:
      games.find((game) => game.slug === entry.slug) ??
      (await toGame(entry.slug)),
  })),
);

await copyFile(path.join(here, "slides.css"), path.join(outDir, "slides.css"));
await copyFile(
  require.resolve("@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"),
  path.join(outDir, "fonts/geist.woff2"),
);
await copyFile(
  require.resolve("@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"),
  path.join(outDir, "fonts/geist-mono.woff2"),
);

const html = renderPost(post, games, library);
await writeFile(path.join(outDir, "index.html"), html);
await writeFile(
  path.join(outDir, "sheet.html"),
  html.replace("<body>", '<body class="sheet">'),
);
if (post.caption)
  await writeFile(path.join(outDir, "caption.txt"), `${post.caption}\n`);
console.log(`wrote ${path.relative(root, outDir)}/index.html`);
if (htmlOnly) process.exit(0);

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

const settle = async (file) => {
  await page.goto(pathToFileURL(path.join(outDir, file)).href);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
  });
};

await settle("index.html");

/** What the contact sheet is too small to show: copy that runs out of the
 *  safe area or under the rail, a name cut to an ellipsis, a blurb that wraps
 *  to a third line. Each is fixed in the post, with shorter copy or an
 *  override. */
const problems = await page.evaluate(() =>
  [...document.querySelectorAll(".slide")].flatMap((slide) => {
    const name = slide.dataset.name;
    const box = slide.getBoundingClientRect();
    const style = getComputedStyle(slide);
    const bottom = box.bottom - parseFloat(style.paddingBottom);
    const right = box.right - parseFloat(style.paddingRight);
    const found = [];
    for (const el of slide.querySelectorAll(
      ".brand, .hook-copy > *, .cta > *, .game-body > *, .rank",
    )) {
      const r = el.getBoundingClientRect();
      if (r.bottom > bottom + 1)
        found.push(`${name}: runs into the caption area`);
      if (r.right > right + 1)
        found.push(`${name}: runs under the right-hand rail`);
    }
    for (const el of slide.querySelectorAll(".dev, .row-title")) {
      if (el.scrollWidth > el.clientWidth)
        found.push(`${name}: "${el.textContent}" is cut off`);
    }
    for (const el of slide.querySelectorAll(".blurb")) {
      const lines = Math.round(
        el.clientHeight / parseFloat(getComputedStyle(el).lineHeight),
      );
      if (lines > 2) found.push(`${name}: blurb runs to ${lines} lines`);
    }
    return [...new Set(found)];
  }),
);
for (const problem of problems) console.warn(`warning: ${problem}`);
const slides = await page.locator(".slide").all();
for (const [i, slide] of slides.entries()) {
  const file = `${String(i + 1).padStart(2, "0")}-${await slide.getAttribute("data-name")}.png`;
  await slide.screenshot({ path: path.join(outDir, file) });
  console.log(`wrote ${path.relative(root, outDir)}/${file}`);
}

await settle("sheet.html");
await page
  .locator("body")
  .screenshot({ path: path.join(outDir, "contact-sheet.png") });
console.log(`wrote ${path.relative(root, outDir)}/contact-sheet.png`);

await browser.close();
