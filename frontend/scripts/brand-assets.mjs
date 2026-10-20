/**
 * Draws the logo and every picture the site hands to other apps: the
 * favicon, the home-screen icons, the link-preview card, and the avatars and
 * banners uploaded by hand to TikTok, Discord and the rest. Run it after
 * changing the logo, the motto or the palette, and commit what it writes to
 * public/ and marketing/brand/.
 *
 *   npm run brand-assets -w frontend
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "../public");
const brandDir = path.join(here, "../../marketing/brand");

// Vellum's own values (src/styles/theme.css). A picture can't read tokens.
const INK = "#0f0e12";
const IRIS = "#6a44f0";
const IRIS_LIGHT = "#8f74ff";
const IRIS_DEEP = "#4a2bc4";
const EMBER = "#ff8438";
const TEXT = "#f4f2f8";
const TEXT_SOFT = "#b9b3c7";
const TEXT_MUTED = "#7d778b";

const MOTTO = "A single home for all your games";

const font = (weight) =>
    readFile(
        require.resolve(
            `@fontsource/geist/files/geist-latin-${weight}-normal.woff`
        )
    );
const fonts = [
    { name: "Geist", data: await font(500), weight: 500, style: "normal" },
    { name: "Geist", data: await font(700), weight: 700, style: "normal" },
    { name: "Geist", data: await font(800), weight: 800, style: "normal" },
];

// Satori lays out with flexbox only, so every box says so.
const el = (type, style, children) => ({
    type,
    props: { style: { display: "flex", ...style }, children },
});

const svgOf = (tree, width, height) => satori(tree, { width, height, fonts });

const png = (svg, width) =>
    new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

/**
 * The mark: "PR." in heavy Geist on an iris gradient, lit from the top left,
 * the full stop in ember. `scale` shrinks the letters inside the square for
 * the crops that cut into it (a maskable icon's circle); `radius` rounds the
 * square for the places nothing else will round it.
 */
const markTree = (size, { scale = 1, radius = 0 } = {}) => {
    const type = size * 0.48 * scale;
    return el(
        "div",
        {
            width: size,
            height: size,
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius,
            overflow: "hidden",
            backgroundImage: `linear-gradient(140deg, ${IRIS_LIGHT} 0%, ${IRIS} 50%, ${IRIS_DEEP} 100%)`,
        },
        [
            el(
                "div",
                {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: size,
                    height: size,
                    backgroundImage:
                        "radial-gradient(ellipse at 18% 8%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%)",
                },
                []
            ),
            el(
                "div",
                {
                    // The dot weighs the word to the left; this sets it back.
                    marginLeft: type * 0.14,
                    fontFamily: "Geist",
                    fontWeight: 800,
                    fontSize: type,
                    lineHeight: 1,
                    letterSpacing: type * -0.06,
                    color: "#ffffff",
                    textShadow: `0 ${size * 0.009}px ${size * 0.028}px rgba(24,8,70,0.35)`,
                },
                [
                    "PR",
                    el("span", { color: EMBER, marginLeft: type * 0.01 }, "."),
                ]
            ),
        ]
    );
};

const mark = (size, options) => svgOf(markTree(size, options), size, size);

/* favicon.svg is square: a bookmark bar or tab strip shows it as drawn, and
   the footer, the preview card and the TikTok slides round it themselves. */
const favicon = await mark(64);

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

const dataUri = (svg) =>
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** The mark beside the name, for anywhere the name isn't already written. */
const lockupTree = (height, color) =>
    el("div", { alignItems: "center", gap: height * 0.32 }, [
        {
            type: "img",
            props: {
                src: dataUri(favicon),
                width: height,
                height,
                style: { borderRadius: height * 0.23 },
            },
        },
        el(
            "div",
            {
                fontFamily: "Geist",
                fontSize: height * 0.86,
                fontWeight: 700,
                letterSpacing: height * -0.03,
                lineHeight: 1,
                color,
            },
            "PlayRates"
        ),
    ]);

const lockup = (color) => svgOf(lockupTree(200, color), 1100, 200);

// The night page with the brand's light falling on it, as the site wears it.
const night = {
    backgroundColor: INK,
    backgroundImage: [
        `radial-gradient(circle at 12% 0%, ${IRIS}66 0%, transparent 55%)`,
        `radial-gradient(circle at 100% 100%, ${EMBER}26 0%, transparent 45%)`,
    ].join(", "),
};

/** 1200x630, the size every preview reader agrees on. */
const card = async () => {
    const tree = el(
        "div",
        {
            width: 1200,
            height: 630,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 80px",
            ...night,
            fontFamily: "Geist",
            color: TEXT,
        },
        [
            el("div", { alignItems: "center", gap: 20 }, [
                {
                    type: "img",
                    props: {
                        src: dataUri(favicon),
                        width: 72,
                        height: 72,
                        style: { borderRadius: 16 },
                    },
                },
                el(
                    "div",
                    {
                        fontSize: 30,
                        fontWeight: 500,
                        color: TEXT_SOFT,
                        letterSpacing: -0.3,
                    },
                    "Video game tracker"
                ),
            ]),
            el("div", { flexDirection: "column" }, [
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
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${TEXT_MUTED}55`,
                    paddingTop: 28,
                    fontSize: 26,
                    color: TEXT_MUTED,
                },
                [
                    el("div", {}, "playrates.app"),
                    el("div", { gap: 12 }, [
                        el(
                            "div",
                            {
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: IRIS_LIGHT,
                            },
                            []
                        ),
                        el(
                            "div",
                            {
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: EMBER,
                            },
                            []
                        ),
                        el(
                            "div",
                            {
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: TEXT_MUTED,
                            },
                            []
                        ),
                    ]),
                ]
            ),
        ]
    );
    return png(await svgOf(tree, 1200, 630), 1200);
};

/**
 * A profile or server banner: the lockup and the address in the middle, on
 * the night page. `markHeight` sizes the lockup; everything that matters
 * stays inside the middle of the picture, where every app's crop keeps it.
 */
const banner = async (width, height, markHeight) => {
    const tree = el(
        "div",
        {
            width,
            height,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: markHeight * 0.4,
            ...night,
            fontFamily: "Geist",
        },
        [
            lockupTree(markHeight, TEXT),
            el(
                "div",
                {
                    fontSize: markHeight * 0.3,
                    fontWeight: 500,
                    color: TEXT_SOFT,
                    letterSpacing: markHeight * -0.004,
                },
                "playrates.app"
            ),
        ]
    );
    return png(await svgOf(tree, width, height), width);
};

const site = {
    "favicon.svg": Buffer.from(favicon),
    "favicon.ico": ico([16, 32, 48]),
    // iOS rounds it itself and wants no transparency.
    "apple-touch-icon.png": png(await mark(180), 180),
    // An installed app's icon sits on a desktop with nothing to round it.
    "icon-192.png": png(await mark(192, { radius: 40 }), 192),
    "icon-512.png": png(await mark(512, { radius: 106 }), 512),
    // Cropped to a circle or a squircle by the phone: the letters keep to the middle.
    "icon-maskable-512.png": png(await mark(512, { scale: 0.7 }), 512),
    // Square and opaque, for search engines' logo slots (Organization in index.html).
    "logo.png": png(await mark(512), 512),
    "og-default.png": await card(),
};

for (const [name, data] of Object.entries(site)) {
    await writeFile(path.join(publicDir, name), data);
    console.log(`wrote public/${name} (${Math.round(data.length / 1024)} KB)`);
}

// Not served by the site; uploaded by hand. Every size is the platform's own.
const kit = {
    // TikTok, Discord, Instagram, YouTube and X all crop it to a circle.
    "avatar.png": png(await mark(1080), 1080),
    "logo.svg": Buffer.from(await mark(1080)),
    "logo-rounded.png": png(await mark(1024, { radius: 230 }), 1024),
    "lockup-on-dark.png": png(await lockup(TEXT), 2200),
    "lockup-on-light.png": png(await lockup(INK), 2200),
    "discord-banner.png": await banner(960, 540, 110),
    "x-header.png": await banner(1500, 500, 110),
    // YouTube shows only the middle 1546x423 on every screen.
    "youtube-banner.png": await banner(2560, 1440, 150),
    "portfolio-banner.png": await banner(2800, 400, 136),
};

await mkdir(brandDir, { recursive: true });
for (const [name, data] of Object.entries(kit)) {
    await writeFile(path.join(brandDir, name), data);
    console.log(
        `wrote marketing/brand/${name} (${Math.round(data.length / 1024)} KB)`
    );
}
