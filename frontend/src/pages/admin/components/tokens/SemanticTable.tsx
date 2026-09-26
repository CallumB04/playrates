import type { SemanticGroup } from "../../../../styles/tokenCatalogue";
import { useTokenValues } from "./useTokenValues";

const Chip = ({ value }: { value: string }) => (
    <span
        className="size-3.5 shrink-0 border border-subtle"
        style={{ backgroundColor: value }}
    />
);

/** One row per token, both themes at once — probes rather than the active
 *  theme, so you can check the one you are not in. */
const SemanticTable = ({ group }: { group: SemanticGroup }) => {
    const values = useTokenValues(group.tokens.map((t) => t.cssVar));

    return (
        <section className="flex flex-col gap-3">
            <header>
                <h3 className="font-display text-section text-content">
                    {group.title}
                </h3>
                <p className="max-w-prose text-body-sm text-content-secondary">
                    {group.blurb}
                </p>
            </header>

            {/* minmax(0, …) so a long token name truncates instead of widening the
                track past the screen. */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
                {group.tokens.map((token) => {
                    const value = values[token.cssVar];
                    return (
                        <div
                            key={token.cssVar}
                            className="flex items-center gap-3 border-b border-subtle py-2"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-xs text-content">
                                    {token.name}
                                </p>
                                <p className="truncate text-xs text-content-muted">
                                    {token.description}
                                </p>
                            </div>
                            <Chip value={value?.light ?? "transparent"} />
                            <span className="w-[68px] shrink-0 font-mono text-[10px] text-content-secondary">
                                {value?.light ?? "—"}
                            </span>
                            <Chip value={value?.dark ?? "transparent"} />
                            <span className="w-[68px] shrink-0 font-mono text-[10px] text-content-secondary">
                                {value?.dark ?? "—"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default SemanticTable;
