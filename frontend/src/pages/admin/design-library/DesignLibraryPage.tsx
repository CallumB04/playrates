import { useState } from "react";
import ColourSection from "./sections/ColourSection";
import SizingSection from "./sections/SizingSection";
import ComponentSection from "./sections/ComponentSection";
import MomentsSection from "./sections/MomentsSection";
import AdminPageHeader from "../components/AdminPageHeader";

const TABS = [
    { id: "colour", label: "Colour", Component: ColourSection },
    { id: "sizing", label: "Sizing & type", Component: SizingSection },
    { id: "components", label: "Components", Component: ComponentSection },
    { id: "moments", label: "First-time", Component: MomentsSection },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Every semantic token and global component, rendered by the code the app
 * ships. Check both themes with the toggle above — anything wrong in one of
 * them is a token to fix, not a component to special-case.
 */
const DesignLibraryPage = () => {
    const [tab, setTab] = useState<TabId>("colour");
    const Active = TABS.find((t) => t.id === tab)!.Component;

    return (
        <>
            <AdminPageHeader
                title="Design library"
                description="Every colour and sizing token, and every shared component, rendered live, and the moments a member meets once, to play on demand. Switch between day and night above to check both."
            />
            <div className="flex flex-col gap-6">
                <div
                    role="tablist"
                    aria-label="Design library sections"
                    className="-mx-5 flex gap-1 overflow-x-auto border-b border-subtle px-5 sm:mx-0 sm:px-0"
                >
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            role="tab"
                            aria-selected={tab === t.id}
                            onClick={() => setTab(t.id)}
                            className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 py-2 font-display text-sm whitespace-nowrap transition-colors sm:min-h-0 sm:px-4 ${
                                tab === t.id
                                    ? "border-b-brand text-brand-text"
                                    : "border-b-transparent text-content-secondary hover:text-content"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <Active />
            </div>
        </>
    );
};

export default DesignLibraryPage;
