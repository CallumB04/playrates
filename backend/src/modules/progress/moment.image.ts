import type { CardThemeKey, Metal } from "@playrates/shared";
import type { IconNode } from "lucide";
import {
  coverData,
  el,
  host,
  loadFonts,
  mark,
  toPng,
  THEMES,
  type Node,
} from "../gaming25/gaming25.image.js";
import { METAL, ring, TEXT, TEXT_MUTED, TEXT_SOFT } from "./progress.image.js";

/** What a moment's picture puts in the middle. */
export type MomentHero =
  | { kind: "badge"; icon: IconNode | null; metal: Metal }
  | { kind: "level"; level: number }
  | { kind: "game"; cover: string | null; rating: number | null }
  | { kind: "shelf"; covers: string[] };

/** One moment worth sharing, as its picture says it. */
export interface MomentSource {
  hero: MomentHero;
  eyebrow: string;
  headline: string;
  detail: string;
  invite: string;
  username: string;
  avatarUrl: string | null;
  level: number;
  theme: CardThemeKey;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const HERO = 600;

/** A long game title steps down rather than running off the picture. */
const headlineSize = (text: string) =>
  text.length > 44 ? 56 : text.length > 26 ? 68 : 88;

/** 9/10 in a sentence, not the table's 9.00/10. */
const outOfTen = (rating: number) => `${Number(rating.toFixed(2))}/10`;

const medal = (icon: IconNode | null, metal: Metal) =>
  el(
    "div",
    {
      width: 440,
      height: 440,
      borderRadius: 220,
      alignItems: "center",
      justifyContent: "center",
      backgroundImage: `linear-gradient(150deg, ${METAL[metal][0]}, ${METAL[metal][1]})`,
      boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
    },
    [
      el(
        "div",
        {
          width: 360,
          height: 360,
          borderRadius: 180,
          border: "6px solid rgba(255,255,255,0.5)",
          alignItems: "center",
          justifyContent: "center",
        },
        icon
          ? [
              el(
                "svg",
                { width: 200, height: 200 },
                icon.map(([tag, attrs]) => el(tag, {}, [], attrs)),
                {
                  width: 200,
                  height: 200,
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "rgba(20,14,30,0.78)",
                  strokeWidth: 2,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                },
              ),
            ]
          : [],
      ),
    ],
  );

const levelRing = (level: number, accent: string, glow: string) =>
  el(
    "div",
    {
      position: "relative",
      width: 460,
      height: 460,
      alignItems: "center",
      justifyContent: "center",
    },
    [
      ring(1, 460, 22, accent),
      el(
        "div",
        {
          width: 380,
          height: 380,
          borderRadius: 190,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `radial-gradient(circle, rgba(${glow},0.35), rgba(${glow},0.05))`,
        },
        [
          el(
            "div",
            {
              fontSize: level >= 100 ? 170 : 220,
              fontWeight: 800,
              letterSpacing: -6,
              color: TEXT,
              lineHeight: 1,
            },
            String(level),
          ),
        ],
      ),
    ],
  );

const cover = (data: string | null, width: number, extra = {}) =>
  data
    ? el(
        "img",
        {
          width,
          height: Math.round(width * (4 / 3)),
          borderRadius: 22,
          boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
          ...extra,
        },
        [],
        { src: data, width, height: Math.round(width * (4 / 3)) },
      )
    : el("div", {
        width,
        height: Math.round(width * (4 / 3)),
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.08)",
        border: "2px solid rgba(255,255,255,0.12)",
        ...extra,
      });

const gameHero = (data: string | null, rating: number | null, accent: string) =>
  el("div", { position: "relative", width: 420, height: 560 }, [
    cover(data, 420),
    rating === null
      ? el("div", {}, [])
      : el(
          "div",
          {
            position: "absolute",
            right: -40,
            bottom: -24,
            height: 96,
            paddingLeft: 30,
            paddingRight: 30,
            borderRadius: 48,
            alignItems: "center",
            backgroundColor: "#0f0d14",
            border: `5px solid ${accent}`,
            fontSize: 48,
            fontWeight: 800,
            color: TEXT,
          },
          outOfTen(rating),
        ),
  ]);

// Fanned out from the middle: the newest on top, in the centre.
const FAN = [
  { left: 0, top: 70, rotate: -14 },
  { left: 470, top: 70, rotate: 14 },
  { left: 90, top: 30, rotate: -7 },
  { left: 380, top: 30, rotate: 7 },
  { left: 235, top: 0, rotate: 0 },
];

const shelfHero = (covers: (string | null)[]) => {
  const shown = covers.slice(0, FAN.length);
  // The innermost slots, outside in, so a short shelf stays centred; the
  // newest cover takes the middle and is drawn last, on top.
  const slots = FAN.slice(FAN.length - shown.length);
  return el(
    "div",
    { position: "relative", width: 790, height: 560 },
    slots.map((slot, i) =>
      cover(shown[shown.length - 1 - i] ?? null, 320, {
        position: "absolute",
        left: slot.left,
        top: slot.top,
        transform: `rotate(${slot.rotate}deg)`,
      }),
    ),
  );
};

/** A moment worth sharing (a badge, a level, a finished game, a shelf
 *  milestone) as a picture of its own, with whose it is along the bottom. */
export const renderMoment = async (moment: MomentSource): Promise<Buffer> => {
  const theme = THEMES[moment.theme];
  const { hero } = moment;
  const [avatar, fontData, covers] = await Promise.all([
    coverData(moment.avatarUrl, fetch),
    loadFonts(),
    Promise.all(
      hero.kind === "game"
        ? [coverData(hero.cover, fetch)]
        : hero.kind === "shelf"
          ? hero.covers.map((url) => coverData(url, fetch))
          : [],
    ),
  ]);

  const middle =
    hero.kind === "badge"
      ? medal(hero.icon, hero.metal)
      : hero.kind === "level"
        ? levelRing(hero.level, theme.accent, theme.glow)
        : hero.kind === "game"
          ? gameHero(covers[0] ?? null, hero.rating, theme.accent)
          : shelfHero(covers);

  const tree: Node = el(
    "div",
    {
      position: "relative",
      width: WIDTH,
      height: HEIGHT,
      flexDirection: "column",
      alignItems: "center",
      backgroundColor: theme.ground,
      backgroundImage: `radial-gradient(ellipse at 50% 32%, rgba(${theme.glow},0.45) 0%, rgba(${theme.glow},0) 62%)`,
      fontFamily: "Geist",
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
            moment.eyebrow,
          ),
          mark(64),
        ],
      ),
      el(
        "div",
        {
          marginTop: 150,
          height: HERO,
          alignItems: "center",
          justifyContent: "center",
        },
        [middle],
      ),
      el(
        "div",
        {
          marginTop: 36,
          maxWidth: 940,
          textAlign: "center",
          justifyContent: "center",
          fontSize: headlineSize(moment.headline),
          fontWeight: 800,
          letterSpacing: -2,
          lineHeight: 1.05,
          color: TEXT,
        },
        moment.headline,
      ),
      el(
        "div",
        {
          marginTop: 14,
          maxWidth: 900,
          textAlign: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 500,
          color: TEXT_SOFT,
        },
        moment.detail,
      ),
      // Whose moment it is, as the player card says it.
      el(
        "div",
        {
          position: "absolute",
          bottom: 116,
          alignItems: "center",
          gap: 18,
        },
        [
          avatar
            ? el("img", { width: 64, height: 64, borderRadius: 32 }, [], {
                src: avatar,
                width: 64,
                height: 64,
              })
            : el(
                "div",
                {
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundImage: `linear-gradient(145deg, rgba(${theme.glow},0.9), rgba(${theme.glow},0.35))`,
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#ffffff",
                },
                moment.username.slice(0, 1).toUpperCase(),
              ),
          el(
            "div",
            { fontSize: 34, fontWeight: 700, color: TEXT },
            moment.username,
          ),
          // The level's own picture says it already.
          hero.kind === "level"
            ? el("div", {}, [])
            : el(
                "div",
                {
                  height: 44,
                  paddingLeft: 18,
                  paddingRight: 18,
                  borderRadius: 22,
                  alignItems: "center",
                  border: `3px solid ${theme.accent}`,
                  fontSize: 22,
                  fontWeight: 800,
                  color: TEXT,
                },
                `LEVEL ${moment.level}`,
              ),
        ],
      ),
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
          el("div", {}, moment.invite),
          el("div", { color: TEXT_SOFT }, `${host}/user/${moment.username}`),
        ],
      ),
    ],
  );

  return toPng(tree, { width: WIDTH, height: HEIGHT }, fontData);
};
