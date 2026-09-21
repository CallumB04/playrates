/* What the design library renders. theme.css has the values, this has what
   each is for; tokenCatalogue.test.ts keeps the two in step. */

export interface RampStep {
    step: string;
    cssVar: string;
}

export interface Ramp {
    name: string;
    note: string;
    steps: RampStep[];
}

const ramp = (prefix: string, steps: string[]): RampStep[] =>
    steps.map((step) => ({ step, cssVar: `--${prefix}-${step}` }));

export const RAMPS: Ramp[] = [
    {
        name: "Iris — the brand",
        note: "periwinkle violet; stays luminous on ink and keeps clear of the art",
        steps: ramp("iris", [
            "50",
            "100",
            "200",
            "300",
            "400",
            "500",
            "600",
            "700",
            "800",
            "900",
            "950",
        ]),
    },
    {
        name: "Ink — the ground",
        note: "warm charcoals; not cold grey, which reads cheap beside box art",
        steps: ramp("ink", [
            "50",
            "100",
            "200",
            "300",
            "400",
            "500",
            "600",
            "700",
            "800",
            "850",
            "900",
            "950",
        ]),
    },
    {
        name: "Ember — the secondary",
        note: "warmth, used sparingly for what should feel earned",
        steps: ramp("ember", ["300", "400", "500", "600"]),
    },
];

export interface SemanticToken {
    /** The semantic name, as used in a utility: bg-surface-raised. */
    name: string;
    /** The custom property behind it, so the resolved value can be shown. */
    cssVar: string;
    description: string;
}

export interface SemanticGroup {
    title: string;
    blurb: string;
    tokens: SemanticToken[];
}

export const SEMANTIC_GROUPS: SemanticGroup[] = [
    {
        title: "Brand",
        blurb: "Iris. Luminous enough to read as light on a dark ground, and far enough from the hues box art uses that it never competes with the covers.",
        tokens: [
            {
                name: "brand",
                cssVar: "--brand",
                description: "Primary actions, active states, links",
            },
            {
                name: "brand-deep",
                cssVar: "--brand-deep",
                description: "The 1px edge under a brand fill",
            },
            {
                name: "brand-hover",
                cssVar: "--brand-hover",
                description: "Hover on a brand fill",
            },
            {
                name: "brand-active",
                cssVar: "--brand-active",
                description: "Pressed state",
            },
            {
                name: "brand-muted",
                cssVar: "--brand-muted",
                description: "Low-emphasis fills and borders",
            },
            {
                name: "brand-subtle",
                cssVar: "--brand-subtle",
                description: "Tinted background behind brand content",
            },
            {
                name: "content-on-solid",
                cssVar: "--content-on-solid",
                description:
                    "Ink on a brand fill. Dark on the luminous violet at night, white on the deeper one by day",
            },
        ],
    },
    {
        title: "Accent",
        blurb: "Ember is a genuine secondary, not a warning — which frees red to mean only danger. Used sparingly, for what should feel earned.",
        tokens: [
            {
                name: "accent",
                cssVar: "--accent",
                description: "Editorial eyebrows, secondary emphasis",
            },
            {
                name: "accent-quiet",
                cssVar: "--accent-quiet",
                description: "Tinted background behind accent content",
            },
            {
                name: "accent-content",
                cssVar: "--accent-content",
                description: "Ink on an accent tint",
            },
        ],
    },
    {
        title: "Surface",
        blurb: "Ordered by how far forward a thing sits. Raised is a card lifted off the page; sunken recedes behind it.",
        tokens: [
            {
                name: "surface",
                cssVar: "--surface",
                description: "Page background — the stock",
            },
            {
                name: "surface-raised",
                cssVar: "--surface-raised",
                description: "Cards, panels, the header",
            },
            {
                name: "surface-sunken",
                cssVar: "--surface-sunken",
                description: "Recessed areas, fields, slider tracks",
            },
            {
                name: "surface-hover",
                cssVar: "--surface-hover",
                description: "Hovered list row",
            },
            {
                name: "surface-active",
                cssVar: "--surface-active",
                description: "Pressed list row",
            },
            {
                name: "surface-selected",
                cssVar: "--surface-selected",
                description: "Selected row or tab",
            },
            {
                name: "surface-overlay",
                cssVar: "--surface-overlay",
                description: "Dropdowns, popovers",
            },
            {
                name: "surface-inverse",
                cssVar: "--surface-inverse",
                description: "Inverted chips and tooltips",
            },
            {
                name: "surface-media",
                cssVar: "--surface-media",
                description: "Behind cover art. Fixed in both themes",
            },
        ],
    },
    {
        title: "Content",
        blurb: "Ink. Named for emphasis, not colour.",
        tokens: [
            {
                name: "content",
                cssVar: "--content",
                description: "Body and headings",
            },
            {
                name: "content-secondary",
                cssVar: "--content-secondary",
                description: "Supporting copy, field labels",
            },
            {
                name: "content-muted",
                cssVar: "--content-muted",
                description: "Eyebrows, placeholders, captions",
            },
            {
                name: "content-disabled",
                cssVar: "--content-disabled",
                description: "Disabled controls (translucent)",
            },
            {
                name: "content-inverse",
                cssVar: "--content-inverse",
                description: "On an inverted surface",
            },
            {
                name: "content-on-media",
                cssVar: "--on-media",
                description: "Over cover art. Fixed in both themes",
            },
        ],
    },
    {
        title: "Rule",
        blurb: "Translucent, so a rule sits on any surface without banding. Subtle divides rows, strong divides sections — most separation is done by elevation now.",
        tokens: [
            {
                name: "border (default)",
                cssVar: "--border-default",
                description: "Default for any bordered element",
            },
            {
                name: "border-subtle",
                cssVar: "--border-subtle",
                description: "Row dividers, ledger hairlines",
            },
            {
                name: "border-faint",
                cssVar: "--border-faint",
                description: "Dividers inside a dense group",
            },
            {
                name: "border-strong",
                cssVar: "--border-strong",
                description: "Plate edges, leader dots, section rules",
            },
            {
                name: "border-focus",
                cssVar: "--border-focus",
                description: "Focused field — a brand rule, never a glow",
            },
        ],
    },
    {
        title: "Status",
        blurb: "Four hues for the top-level states. The played substatuses share the played hue and separate by their mark, so the eight never collide.",
        tokens: [
            {
                name: "status-played",
                cssVar: "--status-played",
                description: "Played, and every substatus of it",
            },
            {
                name: "status-played-quiet",
                cssVar: "--status-played-quiet",
                description: "Played chip background",
            },
            {
                name: "status-playing",
                cssVar: "--status-playing",
                description: "Playing — amber",
            },
            {
                name: "status-playing-quiet",
                cssVar: "--status-playing-quiet",
                description: "Playing chip background",
            },
            {
                name: "status-backlog",
                cssVar: "--status-backlog",
                description: "Backlog — teal",
            },
            {
                name: "status-backlog-quiet",
                cssVar: "--status-backlog-quiet",
                description: "Backlog chip background",
            },
            {
                name: "status-wishlist",
                cssVar: "--status-wishlist",
                description: "Wishlist — rose",
            },
            {
                name: "status-wishlist-quiet",
                cssVar: "--status-wishlist-quiet",
                description: "Wishlist chip background",
            },
        ],
    },
    {
        title: "Feedback",
        blurb: "Bases only. The emphasis ramp is mixed toward the theme's own paper and ink, so one formula serves both themes.",
        tokens: [
            {
                name: "success",
                cssVar: "--success",
                description: "Confirmations, online state",
            },
            {
                name: "danger",
                cssVar: "--danger",
                description: "Destructive actions, errors, offline",
            },
            {
                name: "danger-subtle",
                cssVar: "--danger-subtle",
                description: "Background of an errored field",
            },
            {
                name: "info",
                cssVar: "--info",
                description: "Neutral information",
            },
        ],
    },
];

export interface EffectToken {
    name: string;
    cssVar: string;
    note: string;
    /** A live demo class, so the effect can be seen as well as read. */
    demoClass: string;
}

export const EFFECT_TOKENS: EffectToken[] = [
    {
        name: "shadow-ambient",
        cssVar: "--shadow-ambient",
        note: "the soft far shadow — how far off the page a thing sits",
        demoClass: "bg-surface-raised shadow-e2",
    },
    {
        name: "shadow-key",
        cssVar: "--shadow-key",
        note: "the tighter near shadow, for things that only just lift",
        demoClass: "bg-surface-raised shadow-e1",
    },
    {
        name: "rim",
        cssVar: "--rim",
        note: "the 1px line of light along a lifted top edge",
        demoClass: "bg-surface-raised shadow-e1",
    },
    {
        name: "glow-brand",
        cssVar: "--glow-brand",
        note: "the bloom a hovered thing gathers — light, not paint",
        demoClass: "bg-surface-raised shadow-glow",
    },
    {
        name: "scrim",
        cssVar: "--scrim",
        note: "the wash behind a modal, and its cast shadow",
        demoClass: "bg-surface-raised shadow-modal",
    },
];

export interface TypeStep {
    name: string;
    /** The classes that produce it. */
    utility: string;
    spec: string;
    sample: string;
}

export const TYPE_SCALE: TypeStep[] = [
    {
        name: "Hero / 76",
        utility: "font-display text-hero",
        spec: "76 / 0.98 / -2.8%",
        sample: "Keep count",
    },
    {
        name: "Display / 62",
        utility: "font-display text-display",
        spec: "62 / 1.00 / -2.2%",
        sample: "Lanternfall",
    },
    {
        name: "Title / 44",
        utility: "font-display text-title",
        spec: "44 / 1.00 / -1.8%",
        sample: "ashgrove",
    },
    {
        name: "Section / 22",
        utility: "font-display text-section",
        spec: "22 / 1.15",
        sample: "Reader's notes",
    },
    {
        name: "Body / 15.5",
        utility: "text-body",
        spec: "15.5 / 1.66 / 62ch",
        sample: "A lamplighter walks a drowned coast where the tide takes a street each night.",
    },
    {
        name: "Body small / 13.5",
        utility: "text-body-sm",
        spec: "13.5 / 1.50",
        sample: "Hours played, hours to beat, start and finish dates",
    },
    {
        name: "Figure / 54",
        utility: "font-mono text-figure",
        spec: "tabular · -4%",
        sample: "8.25  1,284  46/52",
    },
    {
        name: "Figure row / 19",
        utility: "font-mono text-figure-row",
        spec: "tabular",
        sample: "412   1,284h   9.75",
    },
    {
        name: "Label / 10",
        utility: "font-mono text-label uppercase",
        spec: "10 / .22em caps",
        sample: "PlayRates average · 2,481 ratings",
    },
    {
        name: "Stamp / 8",
        utility: "font-mono text-stamp uppercase",
        spec: "8 / .10em caps",
        sample: "Mastered · Finished · Shelved · Retired",
    },
];

/** The design's 4pt run, mapped onto Tailwind's existing step names. */
export const SPACING_STEPS: { name: string; px: number }[] = [
    { name: "0.5", px: 2 },
    { name: "1", px: 4 },
    { name: "2", px: 8 },
    { name: "3", px: 12 },
    { name: "4", px: 16 },
    { name: "5", px: 20 },
    { name: "6", px: 24 },
    { name: "8", px: 32 },
    { name: "10", px: 40 },
    { name: "14", px: 56 },
];

export const RADII: { name: string; utility: string; note: string }[] = [
    { name: "xs", utility: "rounded-xs", note: "6 — inline marks" },
    { name: "sm", utility: "rounded-sm", note: "10 — controls, chips" },
    { name: "md", utility: "rounded-md", note: "14 — cards, covers" },
    { name: "lg", utility: "rounded-lg", note: "18 — panels, modals" },
    { name: "xl", utility: "rounded-xl", note: "24 — full-bleed surfaces" },
    { name: "full", utility: "rounded-full", note: "pills and dots" },
];

export const ELEVATION: { name: string; utility: string; note: string }[] = [
    { name: "flat", utility: "", note: "no class at all" },
    { name: "e1", utility: "shadow-e1", note: "only just lifted" },
    { name: "e2", utility: "shadow-e2", note: "cards and covers" },
    { name: "e3", utility: "shadow-e3", note: "raised over content" },
    { name: "modal", utility: "shadow-modal", note: "modals and sheets" },
    { name: "glow", utility: "shadow-glow", note: "the hover bloom" },
];
