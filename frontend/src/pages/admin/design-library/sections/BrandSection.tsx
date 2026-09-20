import { useState } from "react";

/**
 * Brand hue review.
 *
 * The chrome only has to survive one thing: sitting next to box art. Art is
 * saturated, varied and not ours, so the brand is judged here against real
 * covers on the real dark ground rather than as a swatch on a white page.
 *
 * Temporary. This section comes out once the hue is chosen and wired into the
 * semantic layer.
 */

interface Candidate {
    key: string;
    name: string;
    note: string;
    /** 500 / 400 / 600 — fill, hover, edge. */
    base: string;
    light: string;
    deep: string;
    /** The tint behind brand-coloured chips. */
    quiet: string;
}

const CANDIDATES: Candidate[] = [
    {
        key: "iris",
        name: "Iris",
        note: "periwinkle violet · the recommendation",
        base: "var(--iris-500)",
        light: "var(--iris-400)",
        deep: "var(--iris-600)",
        quiet: "color-mix(in srgb, var(--iris-500) 18%, transparent)",
    },
    {
        key: "orchid",
        name: "Orchid",
        note: "magenta-violet · closest to the retiring mulberry",
        base: "var(--orchid-500)",
        light: "var(--orchid-400)",
        deep: "var(--orchid-600)",
        quiet: "color-mix(in srgb, var(--orchid-500) 18%, transparent)",
    },
    {
        key: "azure",
        name: "Azure",
        note: "cooler · reads more platform than personal",
        base: "var(--azure-500)",
        light: "var(--azure-400)",
        deep: "var(--azure-600)",
        quiet: "color-mix(in srgb, var(--azure-500) 18%, transparent)",
    },
];

/* Deliberately varied: a warm brown, a cold blue, a near-monochrome and a
   saturated red. If a hue only works beside one of these it isn't the hue. */
const COVERS = [
    {
        title: "Red Dead Redemption 2",
        url: "https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg",
        rating: "9.25",
    },
    {
        title: "Portal 2",
        url: "https://media.rawg.io/media/games/2ba/2bac0e87cf45e5b508f227d281c9252a.jpg",
        rating: "9.50",
    },
    {
        title: "The Witcher 3",
        url: "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg",
        rating: "9.75",
    },
    {
        title: "Tomb Raider",
        url: "https://media.rawg.io/media/games/021/021c4e21a1824d2526f925eff6324653.jpg",
        rating: "8.00",
    },
];

const Shelf = ({ c }: { c: Candidate }) => (
    <div
        className="flex flex-col gap-5 p-6"
        style={{ background: "var(--ink-950)", borderRadius: "18px" }}
    >
        <div className="flex items-baseline justify-between gap-4">
            <div>
                <h3
                    className="text-[22px] font-semibold tracking-tight"
                    style={{ color: "var(--ink-50)" }}
                >
                    {c.name}
                </h3>
                <p className="text-sm" style={{ color: "var(--ink-400)" }}>
                    {c.note}
                </p>
            </div>
            <code
                className="rounded-full px-3 py-1 text-xs"
                style={{ background: c.quiet, color: c.light }}
            >
                {c.key}-500
            </code>
        </div>

        <div className="grid grid-cols-4 gap-4">
            {COVERS.map((cover) => (
                <div key={cover.title} className="group/c">
                    <div
                        className="relative aspect-3/4 overflow-hidden transition-all duration-300"
                        style={{
                            borderRadius: "14px",
                            boxShadow: `0 1px 0 rgba(255,255,255,.07) inset,
                                        0 10px 28px -10px rgba(0,0,0,.65)`,
                        }}
                    >
                        <img
                            src={cover.url}
                            alt={cover.title}
                            className="size-full object-cover"
                        />
                        {/* The hover bloom, which is where the hue does most
                            of its work — it has to read as light, not paint. */}
                        <span
                            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/c:opacity-100"
                            style={{
                                borderRadius: "14px",
                                boxShadow: `0 0 0 1.5px ${c.base},
                                            0 0 34px -6px ${c.base}`,
                            }}
                        />
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                        <span
                            className="truncate text-[11px]"
                            style={{ color: "var(--ink-400)" }}
                        >
                            Steam
                        </span>
                        {/* The brand figure: the single most repeated use. */}
                        <span
                            className="font-mono text-[13px] font-semibold tabular-nums"
                            style={{ color: c.light }}
                        >
                            {cover.rating}
                        </span>
                    </div>
                </div>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <button
                type="button"
                className="px-4 py-2.5 text-[13.5px] font-semibold transition-transform duration-150 active:translate-y-px"
                style={{
                    borderRadius: "12px",
                    background: c.base,
                    color: "var(--ink-950)",
                    boxShadow: `0 1px 0 rgba(255,255,255,.18) inset,
                                0 8px 20px -8px ${c.base}`,
                }}
            >
                Log this game
            </button>
            <button
                type="button"
                className="px-4 py-2.5 text-[13.5px] font-medium"
                style={{
                    borderRadius: "12px",
                    background: "var(--ink-850)",
                    color: "var(--ink-100)",
                    boxShadow: "0 1px 0 rgba(255,255,255,.06) inset",
                }}
            >
                Wishlist
            </button>
            <span
                className="px-3 py-1.5 text-[11px] font-medium"
                style={{
                    borderRadius: "999px",
                    background: c.quiet,
                    color: c.light,
                }}
            >
                ● Mastered
            </span>
            <span
                className="ml-auto text-[11px]"
                style={{ color: "var(--ink-500)" }}
            >
                hover a cover
            </span>
        </div>
    </div>
);

const BrandSection = () => {
    const [solo, setSolo] = useState<string | null>(null);
    const shown = solo ? CANDIDATES.filter((c) => c.key === solo) : CANDIDATES;

    return (
        <div className="flex flex-col gap-6">
            <div className="border border-strong bg-surface-raised p-4 shadow-lip">
                <h3 className="font-display text-section text-content">
                    Choosing the brand hue
                </h3>
                <p className="mt-1 max-w-prose text-body-sm text-content-secondary">
                    Each block is the Vellum dark ground with real covers on it.
                    The hue appears where it actually appears in the product —
                    the rating figure, the primary action, a status chip, and
                    the bloom on a hovered cover. Covers were picked to fight
                    back: a warm brown, a cold blue, a near-monochrome and a
                    saturated red.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setSolo(null)}
                        className="border border-strong px-3 py-1.5 font-mono text-label-sm uppercase text-content-secondary hover:border-brand"
                    >
                        Compare all
                    </button>
                    {CANDIDATES.map((c) => (
                        <button
                            key={c.key}
                            type="button"
                            onClick={() => setSolo(c.key)}
                            className="border border-strong px-3 py-1.5 font-mono text-label-sm uppercase text-content-secondary hover:border-brand"
                        >
                            {c.name} alone
                        </button>
                    ))}
                </div>
            </div>

            {shown.map((c) => (
                <Shelf key={c.key} c={c} />
            ))}
        </div>
    );
};

export default BrandSection;
