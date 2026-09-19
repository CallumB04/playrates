/**
 * The catalogue the design library renders.
 *
 * Every class string here is written out in full and literally — Tailwind
 * scans source for complete class names, so a composed one would be purged and
 * the swatch would silently render as nothing.
 *
 * Keep this in step with src/styles/tokens.css. It is the human-readable half
 * of the token system: tokens.css says what the values are, this says what
 * each one is *for*.
 */

export interface ColourToken {
    /** The semantic name, as used in a utility: bg-surface-raised. */
    name: string;
    /** Full class applied to the swatch. */
    swatchClass: string;
    /** The CSS custom property behind it, so the resolved value can be shown. */
    cssVar: string;
    description: string;
}

export interface ColourGroup {
    title: string;
    blurb: string;
    tokens: ColourToken[];
}

export const COLOUR_GROUPS: ColourGroup[] = [
    {
        title: "Brand",
        blurb: "The purple identity. `brand` is locked; the others exist so interactive states don't reach for arbitrary shades.",
        tokens: [
            {
                name: "brand",
                swatchClass: "bg-brand",
                cssVar: "--brand",
                description: "Primary actions, active states, links",
            },
            {
                name: "brand-hover",
                swatchClass: "bg-brand-hover",
                cssVar: "--brand-hover",
                description: "Hover. Lighter on dark, darker on light",
            },
            {
                name: "brand-active",
                swatchClass: "bg-brand-active",
                cssVar: "--brand-active",
                description: "Pressed state",
            },
            {
                name: "brand-muted",
                swatchClass: "bg-brand-muted",
                cssVar: "--brand-muted",
                description: "Low-emphasis fills and borders",
            },
            {
                name: "brand-subtle",
                swatchClass: "bg-brand-subtle",
                cssVar: "--brand-subtle",
                description: "Tinted backgrounds behind brand content",
            },
            {
                name: "brand-contrast",
                swatchClass: "bg-brand-contrast",
                cssVar: "--brand-contrast",
                description: "Text and icons on a solid brand fill",
            },
        ],
    },
    {
        title: "Surface",
        blurb: "Backgrounds, roughly ordered by how far forward they sit.",
        tokens: [
            {
                name: "surface",
                swatchClass: "bg-surface",
                cssVar: "--surface",
                description: "Page background",
            },
            {
                name: "surface-sunken",
                swatchClass: "bg-surface-sunken",
                cssVar: "--surface-sunken",
                description: "Wells, insets, slider tracks",
            },
            {
                name: "surface-raised",
                swatchClass: "bg-surface-raised",
                cssVar: "--surface-raised",
                description: "Cards",
            },
            {
                name: "surface-chrome",
                swatchClass: "bg-surface-chrome",
                cssVar: "--surface-chrome",
                description: "Navbar and footer",
            },
            {
                name: "surface-overlay",
                swatchClass: "bg-surface-overlay",
                cssVar: "--surface-overlay",
                description: "Dropdowns, popovers, hover menus",
            },
            {
                name: "surface-overlay-hover",
                swatchClass: "bg-surface-overlay-hover",
                cssVar: "--surface-overlay-hover",
                description: "Hovered item inside an overlay",
            },
            {
                name: "surface-field",
                swatchClass: "bg-surface-field",
                cssVar: "--surface-field",
                description: "Inputs, selects, search bars",
            },
            {
                name: "surface-hover",
                swatchClass: "bg-surface-hover",
                cssVar: "--surface-hover",
                description: "Hovered list row",
            },
            {
                name: "surface-active",
                swatchClass: "bg-surface-active",
                cssVar: "--surface-active",
                description: "Pressed list row",
            },
            {
                name: "surface-selected",
                swatchClass: "bg-surface-selected",
                cssVar: "--surface-selected",
                description: "Selected row or tab",
            },
            {
                name: "surface-inverse",
                swatchClass: "bg-surface-inverse",
                cssVar: "--surface-inverse",
                description: "Inverted chips and tooltips",
            },
            {
                name: "surface-media",
                swatchClass: "bg-surface-media",
                cssVar: "--surface-media",
                description: "Behind cover art. Fixed in both themes",
            },
        ],
    },
    {
        title: "Content",
        blurb: "Text and icons. Named for emphasis, not colour.",
        tokens: [
            {
                name: "content",
                swatchClass: "bg-content",
                cssVar: "--content",
                description: "Body and headings",
            },
            {
                name: "content-secondary",
                swatchClass: "bg-content-secondary",
                cssVar: "--content-secondary",
                description: "Supporting copy, captions",
            },
            {
                name: "content-muted",
                swatchClass: "bg-content-muted",
                cssVar: "--content-muted",
                description: "Placeholders, input icons",
            },
            {
                name: "content-disabled",
                swatchClass: "bg-content-disabled",
                cssVar: "--content-disabled-base",
                description: "Disabled controls (translucent)",
            },
            {
                name: "content-inverse",
                swatchClass: "bg-content-inverse",
                cssVar: "--content-inverse",
                description: "On an inverted surface",
            },
            {
                name: "content-on-media",
                swatchClass: "bg-content-on-media",
                cssVar: "--on-media",
                description: "Over cover art. Fixed in both themes",
            },
        ],
    },
    {
        title: "Border",
        blurb: "Applied with border-*. `DEFAULT` is what a bare `border` class uses.",
        tokens: [
            {
                name: "border-faint",
                swatchClass: "bg-surface-raised border-4 border-faint",
                cssVar: "--border-subtle-base",
                description: "Dividers inside a dense group",
            },
            {
                name: "border-subtle",
                swatchClass: "bg-surface-raised border-4 border-subtle",
                cssVar: "--border-subtle-base",
                description: "Section dividers in popups and cards",
            },
            {
                name: "border (default)",
                swatchClass: "bg-surface-raised border-4",
                cssVar: "--border-default",
                description: "Default for any bordered element",
            },
            {
                name: "border-strong",
                swatchClass: "bg-surface-raised border-4 border-strong",
                cssVar: "--border-strong",
                description: "Emphasised outline, separators that must read",
            },
            {
                name: "border-field",
                swatchClass: "bg-surface-raised border-4 border-field",
                cssVar: "--border-field",
                description: "Input outlines",
            },
            {
                name: "border-focus",
                swatchClass: "bg-surface-raised border-4 border-focus",
                cssVar: "--border-focus",
                description: "Focus ring and focused input",
            },
        ],
    },
    {
        title: "Feedback",
        blurb: "Four states, same shape each: subtle background, content text, border, then an emphasis ramp.",
        tokens: [
            {
                name: "success",
                swatchClass: "bg-success",
                cssVar: "--success",
                description: "Confirmations, online state",
            },
            {
                name: "success-subtle",
                swatchClass: "bg-success-subtle",
                cssVar: "--success-subtle",
                description: "Background of a success chip",
            },
            {
                name: "danger",
                swatchClass: "bg-danger",
                cssVar: "--danger",
                description: "Destructive actions, errors, offline",
            },
            {
                name: "danger-subtle",
                swatchClass: "bg-danger-subtle",
                cssVar: "--danger-subtle",
                description: "Background of an error chip",
            },
            {
                name: "warning",
                swatchClass: "bg-warning",
                cssVar: "--warning",
                description: "Pending states, caution",
            },
            {
                name: "warning-subtle",
                swatchClass: "bg-warning-subtle",
                cssVar: "--warning-subtle",
                description: "Background of a warning chip",
            },
            {
                name: "info",
                swatchClass: "bg-info",
                cssVar: "--info",
                description: "Neutral information",
            },
            {
                name: "info-subtle",
                swatchClass: "bg-info-subtle",
                cssVar: "--info-subtle",
                description: "Background of an info chip",
            },
            {
                name: "gold",
                swatchClass: "bg-gold",
                cssVar: "--accent-gold",
                description: "Ratings and trophies",
            },
        ],
    },
    {
        title: "Game status",
        blurb: "One per log status. Used as a solid for text and at /20 for the badge background.",
        tokens: [
            {
                name: "status-finished",
                swatchClass: "bg-status-finished",
                cssVar: "--status-finished",
                description: "Played → finished",
            },
            {
                name: "status-mastered",
                swatchClass: "bg-status-mastered",
                cssVar: "--status-mastered",
                description: "Played → mastered",
            },
            {
                name: "status-shelved",
                swatchClass: "bg-status-shelved",
                cssVar: "--status-shelved",
                description: "Played → shelved",
            },
            {
                name: "status-retired",
                swatchClass: "bg-status-retired",
                cssVar: "--status-retired",
                description: "Played → retired",
            },
            {
                name: "status-playing",
                swatchClass: "bg-status-playing",
                cssVar: "--status-playing",
                description: "Currently playing",
            },
            {
                name: "status-backlog",
                swatchClass: "bg-status-backlog",
                cssVar: "--status-backlog",
                description: "In the backlog",
            },
            {
                name: "status-wishlist",
                swatchClass: "bg-status-wishlist",
                cssVar: "--status-wishlist",
                description: "On the wishlist",
            },
        ],
    },
];

/* -------------------------------------------------------------------------
 * Sizing
 * ---------------------------------------------------------------------- */

export interface SizingToken {
    name: string;
    value: string;
    demoClass: string;
    description: string;
}

export const RADIUS_TOKENS: SizingToken[] = [
    {
        name: "rounded-xs",
        value: "2px",
        demoClass: "rounded-xs",
        description: "Hairline softening",
    },
    {
        name: "rounded-sm",
        value: "4px",
        demoClass: "rounded-sm",
        description: "Inputs, small chips",
    },
    {
        name: "rounded (md)",
        value: "6px",
        demoClass: "rounded",
        description: "Default. Cards, covers",
    },
    {
        name: "rounded-lg",
        value: "8px",
        demoClass: "rounded-lg",
        description: "Buttons, popups",
    },
    {
        name: "rounded-xl",
        value: "12px",
        demoClass: "rounded-xl",
        description: "Large panels",
    },
    {
        name: "rounded-2xl",
        value: "16px",
        demoClass: "rounded-2xl",
        description: "Feature surfaces",
    },
    {
        name: "rounded-full",
        value: "9999px",
        demoClass: "rounded-full",
        description: "Avatars, pills",
    },
];

export const SHADOW_TOKENS: SizingToken[] = [
    {
        name: "shadow-xs",
        value: "subtle lift",
        demoClass: "shadow-xs",
        description: "Barely separated",
    },
    {
        name: "shadow-sm",
        value: "small",
        demoClass: "shadow-sm",
        description: "Chips, inputs",
    },
    {
        name: "shadow (md)",
        value: "default",
        demoClass: "shadow",
        description: "Cards, popups",
    },
    {
        name: "shadow-lg",
        value: "large",
        demoClass: "shadow-lg",
        description: "Dropdowns",
    },
    {
        name: "shadow-xl",
        value: "x-large",
        demoClass: "shadow-xl",
        description: "Modals",
    },
];

/** Stacking order, decided once so call sites don't invent numbers. */
export const Z_INDEX_TOKENS: {
    name: string;
    value: string;
    description: string;
}[] = [
    { name: "z-base", value: "0", description: "Default flow" },
    { name: "z-raised", value: "10", description: "Lifted within a section" },
    { name: "z-sticky", value: "20", description: "Sticky headers" },
    { name: "z-hover-menu", value: "50", description: "Tile hover menus" },
    { name: "z-navbar", value: "50", description: "Fixed navbar" },
    { name: "z-backdrop", value: "100", description: "Modal backdrop" },
    { name: "z-modal", value: "110", description: "Modal panel" },
    {
        name: "z-toast",
        value: "200",
        description: "Notifications, above everything",
    },
];

/** Tailwind's default type scale, listed so the sizes in use are visible. */
export const TYPE_TOKENS: { name: string; value: string; demoClass: string }[] =
    [
        { name: "text-xs", value: "12px", demoClass: "text-xs" },
        { name: "text-sm", value: "14px", demoClass: "text-sm" },
        { name: "text-base", value: "16px", demoClass: "text-base" },
        { name: "text-lg", value: "18px", demoClass: "text-lg" },
        { name: "text-xl", value: "20px", demoClass: "text-xl" },
        { name: "text-2xl", value: "24px", demoClass: "text-2xl" },
        { name: "text-3xl", value: "30px", demoClass: "text-3xl" },
        { name: "text-4xl", value: "36px", demoClass: "text-4xl" },
    ];

/** The spacing steps the app actually uses, from Tailwind's 4px scale. */
export const SPACING_TOKENS: { name: string; value: string; rem: string }[] = [
    { name: "1", value: "4px", rem: "0.25rem" },
    { name: "2", value: "8px", rem: "0.5rem" },
    { name: "3", value: "12px", rem: "0.75rem" },
    { name: "4", value: "16px", rem: "1rem" },
    { name: "5", value: "20px", rem: "1.25rem" },
    { name: "6", value: "24px", rem: "1.5rem" },
    { name: "8", value: "32px", rem: "2rem" },
    { name: "12", value: "48px", rem: "3rem" },
    { name: "16", value: "64px", rem: "4rem" },
    { name: "navbar", value: "64px", rem: "4rem" },
];
