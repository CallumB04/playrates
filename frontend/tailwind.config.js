/**
 * Colours and sizing come from CSS custom properties in src/styles/tokens.css.
 * This file only maps the SEMANTIC layer onto Tailwind utilities — the raw
 * ramps stay unexposed on purpose, so a component cannot reach past the
 * semantic names and hardcode a specific shade.
 *
 * No colour should be written literally in a component. If a shade is missing,
 * add a semantic token rather than an arbitrary value.
 */

/** Solid token: participates in Tailwind's /<opacity> modifiers. */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

/**
 * Fixed-alpha token, for the handful of places the design uses a translucent
 * colour. The fractions are exact eighth-bit values: 0x33/0xff = 0.2, and so on.
 */
const alpha = (name, value) => `rgb(var(${name}) / ${value})`;

const feedback = (name) => ({
    subtle: token(`--${name}-subtle`),
    content: token(`--${name}-content`),
    border: token(`--${name}-border`),
    muted: token(`--${name}-muted`),
    soft: token(`--${name}-soft`),
    DEFAULT: token(`--${name}`),
    strong: token(`--${name}-strong`),
});

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
            borderWidth: { 3: "3px" },

            borderRadius: {
                xs: "var(--radius-xs)",
                sm: "var(--radius-sm)",
                DEFAULT: "var(--radius-md)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                xl: "var(--radius-xl)",
                "2xl": "var(--radius-2xl)",
                full: "var(--radius-full)",
            },

            boxShadow: {
                xs: "var(--shadow-xs)",
                sm: "var(--shadow-sm)",
                DEFAULT: "var(--shadow-md)",
                md: "var(--shadow-md)",
                lg: "var(--shadow-lg)",
                xl: "var(--shadow-xl)",
            },

            zIndex: {
                base: "var(--z-base)",
                raised: "var(--z-raised)",
                sticky: "var(--z-sticky)",
                "hover-menu": "var(--z-hover-menu)",
                navbar: "var(--z-navbar)",
                backdrop: "var(--z-backdrop)",
                modal: "var(--z-modal)",
                toast: "var(--z-toast)",
            },

            colors: {
                brand: {
                    DEFAULT: token("--brand"),
                    hover: token("--brand-hover"),
                    active: token("--brand-active"),
                    muted: token("--brand-muted"),
                    subtle: token("--brand-subtle"),
                    contrast: token("--brand-contrast"),
                },

                surface: {
                    DEFAULT: token("--surface"),
                    raised: token("--surface-raised"),
                    sunken: token("--surface-sunken"),
                    chrome: token("--surface-chrome"),
                    overlay: token("--surface-overlay"),
                    "overlay-hover": token("--surface-overlay-hover"),
                    "popup-from": token("--surface-popup-from"),
                    "popup-to": token("--surface-popup-to"),
                    field: token("--surface-field"),
                    hover: token("--surface-hover"),
                    active: token("--surface-active"),
                    selected: token("--surface-selected"),
                    inverse: token("--surface-inverse"),
                    media: token("--surface-media"),
                },

                content: {
                    DEFAULT: token("--content"),
                    secondary: token("--content-secondary"),
                    muted: token("--content-muted"),
                    inverse: token("--content-inverse"),
                    "on-brand": token("--brand-contrast"),
                    "on-solid": token("--content-on-solid"),
                    "on-media": token("--on-media"),
                    disabled: alpha("--content-disabled-base", 0.3333),
                },

                /* translucent scrims over photography and popups */
                overlay: {
                    backdrop: alpha("--scrim", 0.4),
                    loading: alpha("--scrim", 0.4667),
                    tile: alpha("--surface-media", 0.7333),
                    avatar: alpha("--surface-media", 0.6),
                    chip: alpha("--overlay-chip-base", 0.8667),
                    "chip-light": alpha("--on-media", 0.1333),
                    "chip-light-hover": alpha("--on-media", 0.2),
                },

                danger: {
                    ...feedback("danger"),
                    tint: alpha("--danger-soft", 0.1333),
                },
                success: feedback("success"),
                warning: feedback("warning"),
                info: feedback("info"),

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
                // Tailwind preflight applies this to every element
                DEFAULT: token("--border-default"),
                subtle: alpha("--border-subtle-base", 0.3333),
                faint: alpha("--border-subtle-base", 0.2667),
                strong: token("--border-strong"),
                field: token("--border-field"),
                focus: token("--border-focus"),
            },

            ringColor: {
                focus: token("--border-focus"),
                brand: token("--brand"),
            },

            accentColor: {
                brand: token("--brand"),
            },
        },
    },
    plugins: [],
};
