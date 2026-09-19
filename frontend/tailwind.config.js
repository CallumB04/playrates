/**
 * Colours are defined as CSS custom properties in src/styles/tokens.css and
 * referenced here through rgb(var(--x) / <alpha-value>), which is what makes
 * opacity modifiers such as `bg-brand/20` work.
 *
 * No colour should be written literally anywhere in src/ — if something needs
 * a shade that does not exist yet, add a token rather than an arbitrary value.
 */

/** Solid token: participates in Tailwind's /<opacity> modifiers. */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

/**
 * Fixed-alpha token. Used where the original design had an 8-digit hex.
 * The fractions below are exact: 0x33/0xff = 0.2, 0x55/0xff = 0.3333, etc.
 */
const alpha = (name, value) => `rgb(var(${name}) / ${value})`;

export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                lexend: ["Lexend", "sans-serif"],
            },
            transitionProperty: {
                height: "height",
                width: "width",
            },
            height: { navbar: "4rem" },
            spacing: { navbar: "4rem" },
            // replaces the border-[3px] arbitrary values (and their safelist entries)
            borderWidth: { 3: "3px" },
            colors: {
                brand: {
                    DEFAULT: token("--brand"),
                    hover: token("--brand-hover"),
                    contrast: token("--brand-contrast"),
                },
                surface: {
                    DEFAULT: token("--surface"),
                    raised: token("--surface-raised"),
                    chrome: token("--surface-chrome"),
                    overlay: token("--surface-overlay"),
                    "overlay-hover": token("--surface-overlay-hover"),
                    "popup-from": token("--surface-popup-from"),
                    "popup-to": token("--surface-popup-to"),
                    field: token("--surface-field"),
                    media: token("--surface-media"),
                },
                content: {
                    DEFAULT: token("--content"),
                    secondary: token("--content-secondary"),
                    muted: token("--content-muted"),
                    inverse: token("--content-inverse"),
                    "on-media": token("--on-media"),
                    disabled: alpha("--content-disabled", 0.3333), // was #ffffff55
                },
                overlay: {
                    backdrop: alpha("--scrim", 0.4), // was #00000066
                    loading: alpha("--scrim", 0.4667), // was #00000077
                    tile: alpha("--surface-media", 0.7333), // was #0e0e0ebb
                    avatar: alpha("--surface-media", 0.6), // was #0e0e0e99
                    chip: alpha("--overlay-chip", 0.8667), // was #2e2e2edd
                    "chip-light": alpha("--on-media", 0.1333), // was #ffffff22
                    "chip-light-hover": alpha("--on-media", 0.2), // was #ffffff33
                },
                danger: {
                    subtle: token("--danger-subtle"),
                    muted: token("--danger-muted"),
                    soft: token("--danger-soft"),
                    DEFAULT: token("--danger"),
                    strong: token("--danger-strong"),
                    tint: alpha("--danger-soft", 0.1333), // was #f8717122
                },
                success: {
                    subtle: token("--success-subtle"),
                    muted: token("--success-muted"),
                    soft: token("--success-soft"),
                    DEFAULT: token("--success"),
                    strong: token("--success-strong"),
                },
                warning: {
                    subtle: token("--warning-subtle"),
                    muted: token("--warning-muted"),
                    soft: token("--warning-soft"),
                    DEFAULT: token("--warning"),
                },
                info: token("--info"),
                gold: token("--accent-gold"),
                status: {
                    finished: token("--status-finished"),
                    mastered: token("--status-mastered"),
                    shelved: token("--status-shelved"),
                    retired: token("--status-retired"),
                    playing: token("--status-playing"),
                    backlog: token("--status-backlog"),
                    wishlist: token("--status-wishlist"),
                },
            },
            borderColor: {
                // Tailwind preflight applies this to every element. Pinned to
                // gray-200 in dark so existing bare `border-2` usages are unchanged.
                DEFAULT: token("--border-default"),
                subtle: alpha("--content-secondary", 0.3333), // was #cacaca55
                faint: alpha("--content-secondary", 0.2667), // was #cacaca44
                field: alpha("--border-field", 0.6), // was #f3f3f399
            },
            accentColor: {
                brand: token("--brand"),
            },
        },
    },
    plugins: [],
};
