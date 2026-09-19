import {
    RADIUS_TOKENS,
    SHADOW_TOKENS,
    SPACING_TOKENS,
    TYPE_TOKENS,
    Z_INDEX_TOKENS,
} from "../../../../styles/tokenCatalogue";

const Group = ({
    title,
    blurb,
    children,
}: {
    title: string;
    blurb: string;
    children: React.ReactNode;
}) => (
    <section className="flex flex-col gap-3">
        <header>
            <h3 className="font-lexend text-lg font-semibold text-content">
                {title}
            </h3>
            <p className="max-w-prose text-sm text-content-secondary">
                {blurb}
            </p>
        </header>
        {children}
    </section>
);

const SizingSection = () => (
    <div className="flex flex-col gap-8">
        <Group
            title="Radius"
            blurb="Corner rounding. Driven by --radius-* so the whole app's roundness can be dialled in one place."
        >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
                {RADIUS_TOKENS.map((t) => (
                    <div key={t.name} className="flex flex-col gap-2">
                        <div
                            className={`h-16 w-full border-2 border-brand bg-brand-subtle ${t.demoClass}`}
                        ></div>
                        <div>
                            <p className="font-mono text-xs text-content">
                                {t.name}
                            </p>
                            <p className="text-xs text-content-muted">
                                {t.value}
                            </p>
                            <p className="text-xs text-content-secondary">
                                {t.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </Group>

        <Group
            title="Elevation"
            blurb="Shadows are tuned for dark surfaces, where a light-mode shadow would be invisible."
        >
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-5">
                {SHADOW_TOKENS.map((t) => (
                    <div key={t.name} className="flex flex-col gap-2">
                        <div
                            className={`h-16 w-full rounded-lg bg-surface-raised ${t.demoClass}`}
                        ></div>
                        <div>
                            <p className="font-mono text-xs text-content">
                                {t.name}
                            </p>
                            <p className="text-xs text-content-secondary">
                                {t.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </Group>

        <Group
            title="Stacking order"
            blurb="Named so a new overlay doesn't need a guessed z-index that later collides."
        >
            <div className="overflow-x-auto rounded-lg border border-subtle">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surface-sunken text-content-secondary">
                        <tr>
                            <th className="px-4 py-2 font-medium">Token</th>
                            <th className="px-4 py-2 font-medium">Value</th>
                            <th className="px-4 py-2 font-medium">Used for</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Z_INDEX_TOKENS.map((t) => (
                            <tr
                                key={t.name}
                                className="border-t border-faint text-content"
                            >
                                <td className="px-4 py-2 font-mono text-xs">
                                    {t.name}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-content-muted">
                                    {t.value}
                                </td>
                                <td className="px-4 py-2 text-content-secondary">
                                    {t.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Group>

        <Group
            title="Type scale"
            blurb="Tailwind's default scale. Lexend throughout; the app sets weight rather than swapping family."
        >
            <div className="flex flex-col gap-2">
                {TYPE_TOKENS.map((t) => (
                    <div
                        key={t.name}
                        className="flex items-baseline gap-4 border-b border-faint pb-2"
                    >
                        <span className="w-24 shrink-0 font-mono text-xs text-content-muted">
                            {t.name}
                        </span>
                        <span className="w-12 shrink-0 font-mono text-xs text-content-muted">
                            {t.value}
                        </span>
                        <span className={`text-content ${t.demoClass}`}>
                            All of your games in one place
                        </span>
                    </div>
                ))}
            </div>
        </Group>

        <Group
            title="Spacing"
            blurb="Tailwind's 4px scale. `navbar` is the one custom step, so header height is set once."
        >
            <div className="flex flex-col gap-1.5">
                {SPACING_TOKENS.map((t) => (
                    <div key={t.name} className="flex items-center gap-4">
                        <span className="w-16 shrink-0 font-mono text-xs text-content-muted">
                            {t.name}
                        </span>
                        <span className="w-16 shrink-0 font-mono text-xs text-content-muted">
                            {t.value}
                        </span>
                        <span
                            className="h-3 rounded-xs bg-brand"
                            style={{ width: t.rem }}
                        ></span>
                    </div>
                ))}
            </div>
        </Group>
    </div>
);

export default SizingSection;
