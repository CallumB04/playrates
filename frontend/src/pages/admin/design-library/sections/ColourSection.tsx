import { COLOUR_GROUPS } from "../../../../styles/tokenCatalogue";
import TokenSwatch from "../../components/TokenSwatch";

const ColourSection = () => (
    <div className="flex flex-col gap-8">
        <div className="rounded-lg border border-subtle bg-surface-raised p-4">
            <h3 className="font-lexend font-semibold text-content">
                How to use these
            </h3>
            <p className="mt-1 max-w-prose text-sm text-content-secondary">
                Components use the semantic names below and nothing else. The
                raw ramps (purple-600, neutral-800, …) are deliberately not
                exposed as utilities, so a component cannot pin itself to one
                shade and break the other theme. If a shade you need is missing,
                add a semantic token to{" "}
                <code className="font-mono text-content">tokens.css</code>{" "}
                rather than reaching for an arbitrary value.
            </p>
        </div>

        {COLOUR_GROUPS.map((group) => (
            <section key={group.title} className="flex flex-col gap-3">
                <header>
                    <h3 className="font-lexend text-lg font-semibold text-content">
                        {group.title}
                    </h3>
                    <p className="max-w-prose text-sm text-content-secondary">
                        {group.blurb}
                    </p>
                </header>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.tokens.map((token) => (
                        <TokenSwatch key={token.name} token={token} />
                    ))}
                </div>
            </section>
        ))}
    </div>
);

export default ColourSection;
