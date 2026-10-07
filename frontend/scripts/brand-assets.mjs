/**
 * Draws the pictures the site hands to other apps: the link-preview card,
 * the home-screen icons and favicon.ico. Run it after changing the logo, the motto or
 * the palette, and commit what it writes to public/.
 *
 *   node scripts/brand-assets.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "../public");

// Vellum's own values (src/styles/theme.css). A picture can't read tokens.
const INK = "#0f0e12";
const IRIS = "#6a44f0";
const IRIS_BRIGHT = "#7c5cff";
const EMBER = "#ff8438";
const TEXT = "#f4f2f8";
const TEXT_SOFT = "#b9b3c7";
const TEXT_MUTED = "#7d778b";

const MOTTO = "A single home for all your games";

const font = (weight) =>
    readFile(
        require.resolve(`@fontsource/geist/files/geist-latin-${weight}-normal.woff`)
    );

const favicon = await readFile(path.join(publicDir, "favicon.svg"), "utf8");
// The PR glyph alone, so the icons can set it on a square of their own.
const glyph = favicon.match(/<path[\s\S]*?\/>/)[0];

/* favicon.svg is square: a bookmark bar or tab strip shows it as drawn, and
   the footer and the preview card round it themselves. An installed app's
   icon sits on the desktop with nothing to round it, so it keeps corners. */
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="13" fill="${IRIS}"/>${glyph}</svg>`;

const png = (svg, width) =>
    new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

// Satori lays out with flexbox only, so every box says so.
const el = (type, style, children) => ({
    type,
    props: { style: { display: "flex", ...style }, children },
});

/** 1200x630, the size every preview reader agrees on. */
const card = async () => {
    const mark = `data:image/svg+xml;base64,${Buffer.from(favicon).toString("base64")}`;

    const tree = el(
        "div",
        {
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 80px",
            backgroundColor: INK,
            backgroundImage: [
                `radial-gradient(circle at 12% 0%, ${IRIS}66 0%, transparent 55%)`,
                `radial-gradient(circle at 100% 100%, ${EMBER}26 0%, transparent 45%)`,
            ].join(", "),
            fontFamily: "Geist",
            color: TEXT,
        },
        [
            el("div", { display: "flex", alignItems: "center", gap: 20 }, [
                {
                    type: "img",
                    props: { src: mark, width: 64, height: 64, style: { borderRadius: 14 } },
                },
                el(
                    "div",
                    { fontSize: 30, fontWeight: 500, color: TEXT_SOFT, letterSpacing: -0.3 },
                    "Video game tracker"
                ),
            ]),
            el("div", { display: "flex", flexDirection: "column" }, [
                el(
                    "div",
                    {
                        fontSize: 148,
                        fontWeight: 700,
                        letterSpacing: -6,
                        lineHeight: 1,
                    },
                    "PlayRates"
                ),
                el(
                    "div",
                    {
                        marginTop: 28,
                        fontSize: 46,
                        fontWeight: 500,
                        color: TEXT_SOFT,
                        letterSpacing: -1,
                    },
                    MOTTO
                ),
            ]),
            el(
                "div",
                {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${TEXT_MUTED}55`,
                    paddingTop: 28,
                    fontSize: 26,
                    color: TEXT_MUTED,
                },
                [
                    el("div", { display: "flex" }, "playrates.app"),
                    el("div", { display: "flex", gap: 12 }, [
                        el("div", { width: 14, height: 14, borderRadius: 7, backgroundColor: IRIS_BRIGHT }, []),
                        el("div", { width: 14, height: 14, borderRadius: 7, backgroundColor: EMBER }, []),
                        el("div", { width: 14, height: 14, borderRadius: 7, backgroundColor: TEXT_MUTED }, []),
                    ]),
                ]
            ),
        ]
    );

    const svg = await satori(tree, {
        width: 1200,
        height: 630,
        fonts: [
            { name: "Geist", data: await font(500), weight: 500, style: "normal" },
            { name: "Geist", data: await font(700), weight: 700, style: "normal" },
        ],
    });
    return png(svg, 1200);
};

/** The glyph on a full square. Maskable icons are cropped to a circle or a
 *  squircle by the phone, so the glyph keeps to the middle 60%. */
const squareIcon = (glyphScale) => {
    const offset = (64 - 64 * glyphScale) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="${IRIS}"/>
        <g transform="translate(${offset} ${offset}) scale(${glyphScale})">${glyph}</g>
    </svg>`;
};

/** PNG-in-ICO, which every browser that still asks for an .ico can read. */
const ico = (sizes) => {
    const images = sizes.map((size) => png(favicon, size));
    const header = Buffer.alloc(6 + 16 * images.length);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);
    let offset = header.length;
    images.forEach((image, i) => {
        const at = 6 + 16 * i;
        header.writeUInt8(sizes[i], at);
        header.writeUInt8(sizes[i], at + 1);
        header.writeUInt16LE(1, at + 4);
        header.writeUInt16LE(32, at + 6);
        header.writeUInt32LE(image.length, at + 8);
        header.writeUInt32LE(offset, at + 12);
        offset += image.length;
    });
    return Buffer.concat([header, ...images]);
};

const outputs = {
    "og-default.png": await card(),
    "favicon.ico": ico([16, 32, 48]),
    "icon-192.png": png(rounded, 192),
    "icon-512.png": png(rounded, 512),
    "icon-maskable-512.png": png(squareIcon(0.62), 512),
};

for (const [name, data] of Object.entries(outputs)) {
    await writeFile(path.join(publicDir, name), data);
    console.log(`wrote public/${name} (${Math.round(data.length / 1024)} KB)`);
}
