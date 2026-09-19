import { useState } from "react";
import ColourSection from "./sections/ColourSection";
import SizingSection from "./sections/SizingSection";
import ComponentSection from "./sections/ComponentSection";

const TABS = [
    { id: "colour", label: "Colour", Component: ColourSection },
    { id: "sizing", label: "Sizing & type", Component: SizingSection },
    { id: "components", label: "Components", Component: ComponentSection },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * A live reference for the design system: every semantic token and every
 * global component, rendered by the same code the app ships.
 *
 * Use the theme toggle in the sidebar to check both themes — anything that
 * looks wrong in one of them is a token that needs fixing rather than a
 * component that needs a special case.
 */
const DesignLibraryPage = () => {
    const [tab, setTab] = useState<TabId>("colour");
    const Active = TABS.find((t) => t.id === tab)!.Component;

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
                <h2 className="font-lexend text-2xl font-semibold text-content">
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
                        className={`-mb-px border-b-2 px-4 py-2 font-lexend text-sm transition-colors ${
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
