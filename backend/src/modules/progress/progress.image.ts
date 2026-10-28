import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { type CardThemeKey, type Metal } from "@playrates/shared";
import {
  coverData,
  el,
  host,
  loadFonts,
  mark,
  THEMES,
  type Node,
} from "../gaming25/gaming25.image.js";

/** Everything the card shows, from the profile, its counts and badges. */
export interface PlayerCardSource {
  username: string;
  avatarUrl: string | null;
  level: number;
  /** 0 to 1 through the level. */
  progress: number;
  xp: number;
  stats: { logged: number; finished: number; reviews: number; hours: number };
  showcase: { name: string; metal: Metal }[];
  /** What the owner wears, and the themes they may wear. */
  theme: CardThemeKey;
  unlocked: CardThemeKey[];
}

const WIDTH = 1080;
const HEIGHT = 1350;
const TEXT = "#f4f2f8";
const TEXT_SOFT = "#b9b3c7";
const TEXT_MUTED = "#7d778b";

// Each metal as a light-to-dark sweep, as the medals on the site.
const METAL: Record<Metal, [string, string]> = {
  1: ["#f0b483", "#8a4a22"],
  2: ["#eef2f7", "#7c8796"],
  3: ["#ffe08a", "#a87400"],
  4: ["#d9f6ff", "#8b7cff"],
};

const ring = (
  progress: number,
  size: number,
  stroke: number,
  colour: string,
) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return el(
    "svg",
    { width: size, height: size, position: "absolute" },
    [
      el("circle", {}, [], {
        cx: size / 2,
        cy: size / 2,
        r,
        fill: "none",
        stroke: "rgba(255,255,255,0.12)",
        strokeWidth: stroke,
      }),
      el("circle", {}, [], {
        cx: size / 2,
        cy: size / 2,
        r,
        fill: "none",
        stroke: colour,
        strokeWidth: stroke,
        strokeLinecap: "round",
        strokeDasharray: `${c * Math.max(0.02, progress)} ${c}`,
        transform: `rotate(-90 ${size / 2} ${size / 2})`,
      }),
    ],
    { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
  );
};

const stat = (value: string, label: string) =>
  el("div", { flexDirection: "column", alignItems: "center", flex: 1 }, [
    el(
      "div",
      { fontSize: 52, fontWeight: 800, color: TEXT, letterSpacing: -1 },
      value,
    ),
    el(
      "div",
      { fontSize: 22, fontWeight: 500, color: TEXT_MUTED, marginTop: 2 },
      label,
    ),
  ]);

const medal = (name: string, metal: Metal) =>
  el("div", { flexDirection: "column", alignItems: "center", width: 160 }, [
    el(
      "div",
      {
        width: 104,
        height: 104,
        borderRadius: 52,
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `linear-gradient(145deg, ${METAL[metal][0]}, ${METAL[metal][1]})`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
      },
      [
        el(
          "div",
          {
            width: 80,
            height: 80,
            borderRadius: 40,
            border: "3px solid rgba(255,255,255,0.55)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 800,
            color: "rgba(20,14,30,0.75)",
          },
          name.slice(0, 1),
        ),
      ],
    ),
    el(
      "div",
      {
        marginTop: 14,
        fontSize: 22,
        fontWeight: 700,
        color: TEXT_SOFT,
        textAlign: "center",
        justifyContent: "center",
      },
      name,
    ),
  ]);

const formatCount = (n: number) =>
  n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString("en-GB");

/** Someone's level and best badges as a picture to post. */
export const renderPlayerCard = async (
  card: PlayerCardSource,
  requested?: CardThemeKey,
): Promise<Buffer> => {
  // A theme the owner hasn't unlocked is quietly their own instead.
  const themeKey =
    requested && card.unlocked.includes(requested) ? requested : card.theme;
  const theme = THEMES[themeKey];
  const [avatar, fontData] = await Promise.all([
    coverData(card.avatarUrl, fetch),
    loadFonts(),
  ]);

  const tree: Node = el(
    "div",
    {
      position: "relative",
      width: WIDTH,
      height: HEIGHT,
      flexDirection: "column",
      alignItems: "center",
      backgroundColor: theme.ground,
      backgroundImage: `radial-gradient(ellipse at 50% 30%, rgba(${theme.glow},0.45) 0%, rgba(${theme.glow},0) 62%)`,
      fontFamily: "Geist",
      paddingTop: 64,
    },
    [
      el(
        "div",
        {
          position: "absolute",
          top: 48,
          left: 56,
          right: 56,
          justifyContent: "space-between",
          alignItems: "center",
        },
        [
          el(
            "div",
            {
              fontSize: 26,
              fontWeight: 700,
              color: TEXT_SOFT,
              letterSpacing: 4,
            },
            "PLAYER CARD",
          ),
          mark(64),
        ],
      ),
      // The avatar inside its level ring.
      el(
        "div",
        {
          position: "relative",
          marginTop: 110,
          width: 420,
          height: 420,
          alignItems: "center",
          justifyContent: "center",
        },
        [
          ring(card.progress, 420, 18, theme.accent),
          avatar
            ? el("img", { width: 340, height: 340, borderRadius: 170 }, [], {
                src: avatar,
                width: 340,
                height: 340,
              })
            : el(
                "div",
                {
                  width: 340,
                  height: 340,
                  borderRadius: 170,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundImage: `linear-gradient(145deg, rgba(${theme.glow},0.9), rgba(${theme.glow},0.35))`,
                  fontSize: 170,
                  fontWeight: 800,
                  color: "#ffffff",
                },
                card.username.slice(0, 1).toUpperCase(),
              ),
          el(
            "div",
            {
              position: "absolute",
              bottom: -6,
              paddingLeft: 30,
              paddingRight: 30,
              height: 70,
              borderRadius: 35,
              alignItems: "center",
              backgroundColor: theme.ground,
              border: `4px solid ${theme.accent}`,
              fontSize: 34,
              fontWeight: 800,
              color: TEXT,
            },
            `LEVEL ${card.level}`,
          ),
        ],
      ),
      el(
        "div",
        {
          marginTop: 40,
          fontSize: 76,
          fontWeight: 800,
          letterSpacing: -2,
          color: TEXT,
        },
        card.username,
      ),
      el(
        "div",
        { marginTop: 4, fontSize: 26, fontWeight: 500, color: TEXT_MUTED },
        `${formatCount(card.xp)} XP`,
      ),
      el(
        "div",
        {
          marginTop: 44,
          width: 900,
          paddingTop: 30,
          paddingBottom: 30,
          borderRadius: 28,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: "2px solid rgba(255,255,255,0.08)",
        },
        [
          stat(formatCount(card.stats.logged), "games"),
          stat(formatCount(card.stats.finished), "finished"),
          stat(formatCount(card.stats.reviews), "reviews"),
          stat(`${formatCount(card.stats.hours)}h`, "played"),
        ],
      ),
      card.showcase.length > 0
        ? el(
            "div",
            { marginTop: 48, justifyContent: "center", gap: 12 },
            card.showcase.slice(0, 5).map((b) => medal(b.name, b.metal)),
          )
        : el("div", {}, []),
      el(
        "div",
        {
          position: "absolute",
          bottom: 40,
          left: 56,
          right: 56,
          justifyContent: "space-between",
          fontSize: 24,
          fontWeight: 500,
          color: TEXT_MUTED,
        },
        [
          el("div", {}, "Level up with me on PlayRates"),
          el("div", { color: TEXT_SOFT }, `${host}/user/${card.username}`),
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
