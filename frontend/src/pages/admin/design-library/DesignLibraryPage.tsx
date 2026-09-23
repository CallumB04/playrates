import { useState } from "react";
import ColourSection from "./sections/ColourSection";
import SizingSection from "./sections/SizingSection";
import ComponentSection from "./sections/ComponentSection";
import { usePageTitle } from "../../../hooks/usePageTitle";

const TABS = [
    { id: "colour", label: "Colour", Component: ColourSection },
    { id: "sizing", label: "Sizing & type", Component: SizingSection },
    { id: "components", label: "Components", Component: ComponentSection },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Every semantic token and global component, rendered by the code the app
 * ships. Check both themes with the sidebar toggle — anything wrong in one of
 * them is a token to fix, not a component to special-case.
 */
const DesignLibraryPage = () => {
    usePageTitle("Design library");

    const [tab, setTab] = useState<TabId>("colour");
    const Active = TABS.find((t) => t.id === tab)!.Component;

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
                <h2 className="font-display text-2xl font-semibold text-content">
                    Design library
                </h2>
                <p className="max-w-prose text-content-secondary">
                    Every colour and sizing token, and every shared component,
                    rendered live. Toggle the theme in the sidebar to check both
                    at once.
                </p>
            </header>

            <div
                role="tablist"
                aria-label="Design library sections"
                className="flex gap-1 border-b border-subtle"
            >
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`-mb-px border-b-2 px-4 py-2 font-display text-sm transition-colors ${
                            tab === t.id
                                ? "border-b-brand text-brand"
                                : "border-b-transparent text-content-secondary hover:text-content"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <Active />
        </div>
    );
};

export default DesignLibraryPage;
