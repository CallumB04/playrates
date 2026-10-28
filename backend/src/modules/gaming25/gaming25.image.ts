import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import {
  GAMING_25_CENTRE,
  GAMING_25_SIZE,
  SITE_ORIGIN,
  type Gaming25ImageLayout,
} from "@playrates/shared";
import type { Gaming25Cells } from "./gaming25.service.js";

// Vellum's own values (frontend/src/styles/theme.css). A picture can't read
// tokens; these match frontend/scripts/brand-assets.mjs.
const INK = "#0f0e12";
const CELL = "#1b1921";
const WELL = "#141218";
const IRIS = "#6a44f0";
const IRIS_LIGHT = "#8f74ff";
const IRIS_DEEP = "#4a2bc4";
const EMBER = "#ff8438";
const TEXT = "#f4f2f8";
const TEXT_SOFT = "#b9b3c7";
const TEXT_MUTED = "#7d778b";

const COLUMNS = 5;
const COVER_RATIO = 4 / 3;

interface Box {
  width: number;
  height: number;
}

export interface Gaming25Geometry {
  canvas: Box;
  /** The grid's top left corner. */
  origin: { x: number; y: number };
  gap: number;
  cell: Box;
  cover: Box;
  /** Room under each cover for its label; 0 shows none. */
  label: number;
}

/**
 * Where everything sits. Portrait is Instagram's tallest feed post, with
 * each cover labelled as the page has it; wide is a link preview, where
 * the grid sits beside the title and is too small to label.
 */
export const gaming25Geometry = (
  layout: Gaming25ImageLayout,
): Gaming25Geometry => {
  if (layout === "wide") {
    const canvas = { width: 1200, height: 630 };
    const gap = 8;
    const top = 36;
    const cellH = (canvas.height - top * 2 - gap * (COLUMNS - 1)) / COLUMNS;
    const cell = { width: Math.floor(cellH / COVER_RATIO), height: cellH };
    const gridW = cell.width * COLUMNS + gap * (COLUMNS - 1);
    return {
      canvas,
      origin: { x: canvas.width - 56 - gridW, y: top },
      gap,
      cell,
      cover: cell,
      label: 0,
    };
  }

  const canvas = { width: 1080, height: 1350 };
  const side = 48;
  const gap = 12;
  const header = 166;
  const footer = 88;
  const label = 46;
  const cell = {
    width: (canvas.width - side * 2 - gap * (COLUMNS - 1)) / COLUMNS,
    height: (canvas.height - header - footer - gap * (COLUMNS - 1)) / COLUMNS,
  };
  const coverH = cell.height - label - 16;
  return {
    canvas,
    origin: { x: side, y: header },
    gap,
    cell,
    cover: { width: Math.round(coverH / COVER_RATIO), height: coverH },
    label,
  };
};

/** IGDB serves any size from the same image id; the grid needs a small
 *  one, and 25 of the large ones would be slow to fetch and to draw. */
export const coverSize = (url: string): string =>
  url.replace(/\/t_[a-z0-9_]+\//, "/t_cover_big/");

type Fetch = typeof fetch;

const COVER_TIMEOUT_MS = 4000;

/** A cover as a data URI, or null when it can't be had in time: a missing
 *  cover is an empty well, not a failed picture. */
const coverData = async (
  url: string | null | undefined,
  fetchImpl: Fetch,
): Promise<string | null> => {
  if (!url?.startsWith("https://")) return null;
  try {
    const res = await fetchImpl(coverSize(url), {
      signal: AbortSignal.timeout(COVER_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
};

const require = createRequire(import.meta.url);

type Font = { name: string; data: Buffer; weight: 500 | 700 | 800 };
let fonts: Promise<Font[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(
    ([500, 700, 800] as const).map(async (weight) => ({
      name: "Geist",
      weight,
      data: await readFile(
        require.resolve(
          `@fontsource/geist/files/geist-latin-${weight}-normal.woff`,
        ),
      ),
    })),
  ));

interface Node {
  type: string;
  props: Record<string, unknown>;
}

// Satori lays out with flexbox only, so every box says so.
const el = (
  type: string,
  style: Record<string, unknown>,
  children: unknown = [],
  props: Record<string, unknown> = {},
): Node => ({
  type,
  props: { ...props, style: { display: "flex", ...style }, children },
});

const mark = (size: number) =>
  el(
    "div",
    {
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: size * 0.24,
      backgroundImage: `linear-gradient(140deg, ${IRIS_LIGHT} 0%, ${IRIS} 50%, ${IRIS_DEEP} 100%)`,
      fontWeight: 800,
      fontSize: size * 0.48,
      letterSpacing: size * 0.48 * -0.06,
      color: "#ffffff",
    },
    ["PR", el("span", { color: EMBER }, ".")],
  );

const cellNode = (
  g: Gaming25Geometry,
  label: string,
  cover: string | null,
  centre: boolean,
): Node => {
  const radius = g.label ? 14 : 8;
  const art = cover
    ? el(
        "img",
        { width: g.cover.width, height: g.cover.height, borderRadius: 6 },
        [],
        {
          src: cover,
          width: g.cover.width,
          height: g.cover.height,
        },
      )
    : el("div", {
        width: g.cover.width,
        height: g.cover.height,
        borderRadius: 6,
        backgroundColor: WELL,
        border: `2px solid ${centre ? IRIS : "#2a2731"}`,
      });

  if (!g.label) {
    return el(
      "div",
      {
        width: g.cell.width,
        height: g.cell.height,
        borderRadius: radius,
        overflow: "hidden",
        border: centre ? `3px solid ${IRIS_LIGHT}` : "none",
        boxShadow: centre ? `0 0 24px ${IRIS}` : "none",
      },
      [art],
    );
  }

  return el(
    "div",
    {
      width: g.cell.width,
      height: g.cell.height,
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 8,
      borderRadius: radius,
      backgroundColor: centre ? "#241c44" : CELL,
      border: `2px solid ${centre ? IRIS_LIGHT : CELL}`,
      boxShadow: centre ? `0 0 32px rgba(106,68,240,0.55)` : "none",
    },
    [
      art,
      el(
        "div",
        {
          height: g.label,
          width: "100%",
          paddingLeft: 6,
          paddingRight: 6,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 17,
          lineHeight: 1.15,
          fontWeight: centre ? 800 : 700,
          color: centre ? IRIS_LIGHT : TEXT,
        },
        label,
      ),
    ],
  );
};

const gridNode = (
  g: Gaming25Geometry,
  cells: Gaming25Cells["cells"],
  covers: (string | null)[],
): Node =>
  el(
    "div",
    {
      position: "absolute",
      left: g.origin.x,
      top: g.origin.y,
      width: g.cell.width * COLUMNS + g.gap * (COLUMNS - 1),
      flexWrap: "wrap",
      gap: g.gap,
    },
    cells.map((cell, i) =>
      cellNode(
        g,
        cell.label,
        covers[i] ?? null,
        cell.category === GAMING_25_CENTRE,
      ),
    ),
  );

const host = new URL(SITE_ORIGIN).host;

const portrait = (
  g: Gaming25Geometry,
  grid: Gaming25Cells,
  covers: (string | null)[],
): Node =>
  el(
    "div",
    {
      position: "relative",
      width: g.canvas.width,
      height: g.canvas.height,
      backgroundColor: INK,
      backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(106,68,240,0.32) 0%, rgba(106,68,240,0) 60%)`,
      fontFamily: "Geist",
    },
    [
      el(
        "div",
        {
          position: "absolute",
          left: g.origin.x,
          right: g.origin.x,
          top: 40,
          alignItems: "center",
          justifyContent: "space-between",
        },
        [
          el("div", { flexDirection: "column" }, [
            el(
              "div",
              { fontSize: 26, fontWeight: 500, color: TEXT_SOFT },
              `${grid.username}'s`,
            ),
            el(
              "div",
              {
                fontSize: 58,
                fontWeight: 800,
                letterSpacing: -2,
                color: TEXT,
                lineHeight: 1,
                marginTop: 4,
              },
              "Gaming 25",
            ),
          ]),
          mark(72),
        ],
      ),
      gridNode(g, grid.cells, covers),
      el(
        "div",
        {
          position: "absolute",
          left: g.origin.x,
          right: g.origin.x,
          bottom: 34,
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
            `${host}/user/${grid.username}/gaming-25`,
          ),
        ],
      ),
    ],
  );

const wide = (
  g: Gaming25Geometry,
  grid: Gaming25Cells,
  covers: (string | null)[],
): Node =>
  el(
    "div",
    {
      position: "relative",
      width: g.canvas.width,
      height: g.canvas.height,
      backgroundColor: INK,
      backgroundImage: `radial-gradient(ellipse at 0% 0%, rgba(106,68,240,0.38) 0%, rgba(106,68,240,0) 60%)`,
      fontFamily: "Geist",
    },
    [
      el(
        "div",
        {
          position: "absolute",
          left: 64,
          top: 0,
          bottom: 0,
          width: g.origin.x - 64 - 48,
          flexDirection: "column",
          justifyContent: "center",
        },
        [
          mark(84),
          el(
            "div",
            {
              marginTop: 40,
              fontSize: 34,
              fontWeight: 500,
              color: TEXT_SOFT,
            },
            `${grid.username}'s`,
          ),
          el(
            "div",
            {
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
              color: TEXT,
              marginTop: 6,
            },
            "Gaming 25",
          ),
          el(
            "div",
            { marginTop: 28, fontSize: 26, fontWeight: 500, color: TEXT_MUTED },
            `${grid.pickCount} of ${GAMING_25_SIZE} picked · ${host}`,
          ),
        ],
      ),
      gridNode(g, grid.cells, covers),
    ],
  );

/** The grid as a PNG, to post or to preview a link with. */
export const renderGaming25 = async (
  grid: Gaming25Cells,
  layout: Gaming25ImageLayout,
  fetchImpl: Fetch = fetch,
): Promise<Buffer> => {
  const g = gaming25Geometry(layout);
  const [covers, fontData] = await Promise.all([
    Promise.all(
      grid.cells.map((cell) => coverData(cell.game?.coverUrl, fetchImpl)),
    ),
    loadFonts(),
  ]);
  const tree =
    layout === "wide" ? wide(g, grid, covers) : portrait(g, grid, covers);
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: g.canvas.width,
    height: g.canvas.height,
    fonts: fontData.map((f) => ({ ...f, style: "normal" as const })),
  });
  return new Resvg(svg, {
    fitTo: { mode: "width", value: g.canvas.width },
  })
    .render()
    .asPng();
};
