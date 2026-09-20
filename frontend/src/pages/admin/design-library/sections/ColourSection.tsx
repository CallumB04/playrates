import {
    EFFECT_TOKENS,
    RAMPS,
    SEMANTIC_GROUPS,
} from "../../../../styles/tokenCatalogue";
import RampRow from "../../components/tokens/RampRow";
import SemanticTable from "../../components/tokens/SemanticTable";
import { useTokenValues } from "../../components/tokens/useTokenValues";
import { cn } from "../../../../lib/cn";

const EffectTable = () => {
    const values = useTokenValues(EFFECT_TOKENS.map((e) => e.cssVar));

    return (
        <section className="flex flex-col gap-3">
            <header>
                <h3 className="font-display text-section text-content">
                    Effects
                </h3>
                <p className="max-w-prose text-body-sm text-content-secondary">
                    The signature device. Anything you own is pressed into the
                    paper with a warm inset and a 1px light lip; anything the
                    system tells you sits on top of it. Pressed-versus-raised is
                    how state reads before colour arrives.
                </p>
            </header>

            {EFFECT_TOKENS.map((effect) => (
                <div
                    key={effect.cssVar}
                    className="flex items-center gap-4 border-b border-subtle py-3"
                >
                    <div
                        className={cn(
                            "size-12 shrink-0 border border-strong",
                            effect.demoClass
                        )}
                    />
                    <span className="w-32 shrink-0 font-mono text-xs text-content">
                        {effect.name}
                    </span>
                    <span className="hidden w-[150px] shrink-0 font-mono text-[10px] text-content-secondary sm:block">
                        {values[effect.cssVar]?.light ?? "—"}
                    </span>
                    <span className="hidden w-[150px] shrink-0 font-mono text-[10px] text-content-secondary sm:block">
                        {values[effect.cssVar]?.dark ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-content-muted">
                        {effect.note}
                    </span>
                </div>
            ))}
        </section>
    );
};

const ColourSection = () => (
    <div className="flex flex-col gap-10">
        <div className="border border-strong bg-surface-raised p-4 shadow-lip">
            <h3 className="font-display text-section text-content">
                How to use these
            </h3>
            <p className="mt-1 max-w-prose text-body-sm text-content-secondary">
                Components use the semantic names and nothing else. The raw
                ramps are deliberately not exposed as utilities, so a component
                cannot pin itself to one shade and break the other theme. Every
                semantic row below shows both mappings at once — the values are
                read back from probe elements, so the table reads the same
                whichever theme you are browsing in.
            </p>
        </div>

        <section className="flex flex-col gap-6">
            <h2 className="rule-double pb-2 font-mono text-label uppercase text-content-muted">
                Ramps — raw, not exposed
            </h2>
            {RAMPS.map((ramp) => (
                <RampRow key={ramp.name} ramp={ramp} />
            ))}
        </section>

        <section className="flex flex-col gap-8">
            <h2 className="rule-double pb-2 font-mono text-label uppercase text-content-muted">
                Semantic — one set, two mappings
                <span className="ml-3 normal-case tracking-normal text-content-muted">
                    light · dark
                </span>
            </h2>
            {SEMANTIC_GROUPS.map((group) => (
                <SemanticTable key={group.title} group={group} />
            ))}
        </section>

        <section className="flex flex-col gap-3">
            <h2 className="rule-double pb-2 font-mono text-label uppercase text-content-muted">
                Effects
            </h2>
            <EffectTable />
        </section>
    </div>
);

export default ColourSection;
