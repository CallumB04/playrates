import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import {
  CARD_THEME_KEYS,
  type CardThemeKey,
  type GameListDetail,
  type GameListEntry,
} from "@playrates/shared";
import {
  coverData,
  el,
  host,
  loadFonts,
  mark,
  THEMES,
  type Node,
} from "../gaming25/gaming25.image.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";

const WIDTH = 1080;
const HEIGHT = 1350;
const SIDE = 64;
const GAP = 20;
const COVER_RATIO = 4 / 3;
// What's left for the covers under the longest title, two lines of it.
const MOSAIC = { width: WIDTH - SIDE * 2, height: 840 };
// One or two covers alone would fill the picture edge to edge.
const MAX_COVER_WIDTH = 480;

const CELL = "#1b1921";
const TEXT = "#f4f2f8";
const TEXT_SOFT = "#b9b3c7";
const TEXT_MUTED = "#7d778b";

type Fetch = typeof fetch;

/** The owner's card theme, which a picture of theirs is drawn in. */
export const ownerTheme = async (
  profiles: Pick<ProfilesRepository, "findByUsername"> | undefined,
  username: string,
): Promise<CardThemeKey> => {
  const theme = (await profiles?.findByUsername(username))?.card_theme;
  return CARD_THEME_KEYS.includes(theme as CardThemeKey)
    ? (theme as CardThemeKey)
    : "default";
};

/**
 * The games the picture shows. A ranked list shows its top, in order; any
 * other leads with the covers its owner picked, as its card does.
 */
export const shareGames = (
  list: Pick<GameListDetail, "ranked" | "coverGameIds" | "games">,
  max: number,
): GameListEntry[] => {
  if (list.ranked) return list.games.slice(0, max);
  const picked = (list.coverGameIds ?? []).flatMap(
    (id) => list.games.find((entry) => entry.game.id === id) ?? [],
  );
  const rest = list.games.filter((entry) => !picked.includes(entry));
  return [...picked, ...rest].slice(0, max);
};

export interface Mosaic {
  columns: number;
  rows: number;
  cover: { width: number; height: number };
}

/** Full rows only: a gap in the grid reads as a game gone missing. */
export const mosaicFor = (count: number): Mosaic => {
  const [columns, rows] =
    count >= 6 ? [3, 2] : count >= 4 ? [2, 2] : [Math.max(count, 1), 1];
  const width = Math.min(
    MAX_COVER_WIDTH,
    (MOSAIC.width - GAP * (columns - 1)) / columns,
    ((MOSAIC.height - GAP * (rows - 1)) / rows) / COVER_RATIO,
  );
  return {
    columns,
    rows,
    cover: {
      width: Math.floor(width),
      height: Math.floor(width * COVER_RATIO),
    },
  };
};

const titleSize = (name: string) =>
  name.length <= 18 ? 84 : name.length <= 34 ? 68 : 56;

const rankBadge = (rank: number, accent: string) =>
  el(
    "div",
    {
      position: "absolute",
      top: 12,
      left: 12,
      height: 46,
      minWidth: 46,
      paddingLeft: 14,
      paddingRight: 14,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(10,9,14,0.84)",
      border: "1.5px solid rgba(255,255,255,0.14)",
      fontSize: 24,
      fontWeight: 800,
      color: TEXT,
    },
    [el("span", { color: accent, marginRight: 1 }, "#"), String(rank)],
  );

const coverNode = (
  mosaic: Mosaic,
  entry: GameListEntry | null,
  art: string | null,
  ranked: boolean,
  accent: string,
): Node => {
  const { width, height } = mosaic.cover;
  const inner = art
    ? el("img", { width, height, objectFit: "cover" }, [], {
        src: art,
        width,
        height,
      })
    : // No art to be had: the title in its place, so the slot still says
      // which game it is. A list with no games gets hollow ones.
      el(
        "div",
        {
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          textAlign: "center",
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.2,
          color: TEXT_SOFT,
          borderRadius: 16,
          border: entry ? "none" : "2px dashed #3a3644",
        },
        entry?.game.title ?? "",
      );
  return el(
    "div",
    {
      position: "relative",
      width,
      height,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: entry ? CELL : "transparent",
      boxShadow: entry ? "0 18px 40px rgba(0,0,0,0.5)" : "none",
    },
    [inner, ...(ranked && entry ? [rankBadge(entry.rank, accent)] : [])],
  );
};

const avatarNode = (avatar: string | null, username: string, glow: string) =>
  avatar
    ? el("img", { width: 72, height: 72, borderRadius: 36 }, [], {
        src: avatar,
        width: 72,
        height: 72,
      })
    : el(
        "div",
        {
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `linear-gradient(145deg, rgba(${glow},0.9), rgba(${glow},0.35))`,
          fontSize: 34,
          fontWeight: 800,
          color: "#ffffff",
        },
        username.slice(0, 1).toUpperCase(),
      );

/** A public list as a picture to post: its name, its owner, its covers. */
export const renderListImage = async (
  list: GameListDetail,
  fetchImpl: Fetch = fetch,
  themeKey: CardThemeKey = "default",
): Promise<Buffer> => {
  const theme = THEMES[themeKey];
  const mosaic = mosaicFor(list.games.length);
  const shown = shareGames(list, mosaic.columns * mosaic.rows);
  const [covers, avatar, fontData] = await Promise.all([
    Promise.all(
      shown.map((entry) => coverData(entry.game.coverUrl, fetchImpl)),
    ),
    coverData(list.owner.avatarUrl, fetchImpl),
    loadFonts(),
  ]);
  const slots = Array.from(
    { length: mosaic.columns * mosaic.rows },
    (_, i) => i,
  );
  const count = list.gameCount;

  const tree: Node = el(
    "div",
    {
      position: "relative",
      width: WIDTH,
      height: HEIGHT,
      flexDirection: "column",
      paddingTop: 56,
      paddingLeft: SIDE,
      paddingRight: SIDE,
      paddingBottom: 40,
      backgroundColor: theme.ground,
      backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(${theme.glow},0.34) 0%, rgba(${theme.glow},0) 62%)`,
      fontFamily: "Geist",
    },
    [
      el("div", { alignItems: "center", justifyContent: "space-between" }, [
        el("div", { alignItems: "center", gap: 18 }, [
          avatarNode(avatar, list.owner.username, theme.glow),
          el("div", { flexDirection: "column" }, [
            el(
              "div",
              { fontSize: 22, fontWeight: 500, color: TEXT_MUTED },
              "A list by",
            ),
            el(
              "div",
              { fontSize: 32, fontWeight: 700, color: TEXT, marginTop: 2 },
              list.owner.username,
            ),
          ]),
        ]),
        mark(72),
      ]),
      el(
        "div",
        {
          marginTop: 44,
          fontSize: titleSize(list.name),
          fontWeight: 800,
          letterSpacing: titleSize(list.name) * -0.035,
          lineHeight: 1.04,
          color: TEXT,
          lineClamp: 2,
        },
        list.name,
      ),
      el(
        "div",
        {
          marginTop: 18,
          alignItems: "center",
          gap: 14,
          fontSize: 26,
          fontWeight: 500,
          color: TEXT_SOFT,
        },
        [
          `${count.toLocaleString("en-GB")} ${count === 1 ? "game" : "games"}`,
          ...(list.ranked
            ? [
                el("div", { color: TEXT_MUTED }, "·"),
                el("div", { color: theme.accent, fontWeight: 700 }, "Ranked"),
              ]
            : []),
        ],
      ),
      el(
        "div",
        { flexGrow: 1, alignItems: "center", justifyContent: "center" },
        [
          el(
            "div",
            {
              width:
                mosaic.cover.width * mosaic.columns + GAP * (mosaic.columns - 1),
              flexWrap: "wrap",
              gap: GAP,
            },
            slots.map((i) =>
              coverNode(
                mosaic,
                shown[i] ?? null,
                covers[i] ?? null,
                list.ranked,
                theme.accent,
              ),
            ),
          ),
        ],
      ),
      el(
        "div",
        {
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          fontWeight: 500,
          color: TEXT_MUTED,
        },
        [
          el("div", {}, "Make yours on PlayRates"),
          el(
            "div",
            { color: TEXT_SOFT },
            `${host}/user/${list.owner.username}/lists/${list.id}`,
          ),
        ],
      ),
    ],
  );

  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: fontData.map((f) => ({ ...f, style: "normal" as const })),
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } })
    .render()
    .asPng();
};
