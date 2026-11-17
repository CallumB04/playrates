import { useId, useState } from "react";
import { Check, ChevronDown, Trophy } from "lucide-react";
import type { AwardPicks, AwardsPhase } from "@playrates/shared";
import Popup from "../../../components/ui/Popup";
import ShareBar from "../../../components/events/ShareBar";
import { cn } from "../../../lib/cn";
import { categoryAnchor, type CategoryGroup } from "../../../lib/events";
import { goToCategory } from "./useActiveCategory";

interface NavProps {
    groups: CategoryGroup[];
    picks: AwardPicks;
    phase: AwardsPhase;
    /** The anchor of the category being read. */
    active: string | null;
    /** Picks made, of those there are to make. */
    made: { picked: number; total: number };
}

/** Every category, grouped as the page is, each marked once it's picked
 *  (or, after the show, once you've called it). */
const CategoryList = ({
    groups,
    picks,
    phase,
    active,
    onGo,
}: Omit<NavProps, "made"> & { onGo: (anchor: string) => void }) => (
    <div className="flex flex-col gap-4">
        {groups.map((group) => (
            <div key={`${group.section}-${group.lead}`}>
                {group.section && (
                    <p className="px-3 pb-1 text-label-sm font-semibold text-content-muted">
                        {group.section}
                    </p>
                )}
                <ul className="flex flex-col">
                    {group.categories.map((category) => {
                        const anchor = categoryAnchor(category);
                        const pick = picks[category.id];
                        const called =
                            phase === "results" &&
                            category.nominees.some(
                                (n) => n.won && n.id === pick
                            );
                        return (
                            <li key={category.id}>
                                <a
                                    href={`#${anchor}`}
                                    aria-current={
                                        anchor === active
                                            ? "location"
                                            : undefined
                                    }
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onGo(anchor);
                                    }}
                                    className={cn(
                                        "flex min-h-11 items-center gap-2.5 rounded-md px-3 text-body-sm transition-colors hover:bg-surface-hover lg:min-h-9",
                                        anchor === active
                                            ? "bg-surface-selected font-medium text-content"
                                            : "text-content-secondary"
                                    )}
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "flex size-4 shrink-0 items-center justify-center rounded-full border",
                                            pick !== undefined
                                                ? "border-brand bg-brand text-content-on-solid"
                                                : "border-strong"
                                        )}
                                    >
                                        {called ? (
                                            <Trophy size={10} />
                                        ) : (
                                            pick !== undefined && (
                                                <Check size={10} />
                                            )
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">
                                        {category.name}
                                    </span>
                                    {pick !== undefined && (
                                        <span className="sr-only">
                                            {called
                                                ? ", called it"
                                                : ", picked"}
                                        </span>
                                    )}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>
        ))}
    </div>
);

const Tally = ({ made }: { made: NavProps["made"] }) => (
    <div className="flex flex-col gap-2 px-3">
        <p className="text-label-sm text-content-muted">
            <span className="font-semibold text-content">
                {made.picked} of {made.total}
            </span>{" "}
            picked
        </p>
        <ShareBar
            value={made.total === 0 ? 0 : made.picked / made.total}
            label={`${made.picked} of ${made.total} picked`}
        />
    </div>
);

/**
 * The way round an awards night's categories. Beside them on a wide
 * screen, standing as you scroll; on a phone, a bar under the header that
 * says where you are and opens the whole list in a sheet.
 */
const AwardsNav = ({ groups, picks, phase, active, made }: NavProps) => {
    const [open, setOpen] = useState(false);
    const titleId = useId();
    const here = groups
        .flatMap((g) => g.categories)
        .find((c) => categoryAnchor(c) === active);

    return (
        <>
            <nav
                aria-label="Awards"
                className="sticky top-[calc(var(--spacing-navbar)+1.5rem)] hidden max-h-[calc(100dvh-var(--spacing-navbar)-3rem)] flex-col gap-4 overflow-y-auto pb-4 lg:flex"
            >
                <Tally made={made} />
                <CategoryList
                    groups={groups}
                    picks={picks}
                    phase={phase}
                    active={active}
                    onGo={goToCategory}
                />
            </nav>

            <div className="sticky top-navbar z-30 -mx-5 border-b border-subtle bg-surface/95 px-5 py-2 backdrop-blur-lg sm:-mx-8 sm:px-8 lg:hidden">
                <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={() => setOpen(true)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md text-left"
                >
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-semibold text-content">
                            {here?.name ?? "The awards"}
                        </span>
                        <span className="block text-label-sm text-content-muted">
                            {made.picked} of {made.total} picked
                        </span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-sm border border-subtle px-2.5 py-1.5 text-label-sm font-semibold text-content-secondary">
                        All awards
                        <ChevronDown size={14} aria-hidden />
                    </span>
                </button>
            </div>

            {open && (
                <Popup
                    titleId={titleId}
                    title="All awards"
                    blurb={`${made.picked} of ${made.total} picked`}
                    onClose={() => setOpen(false)}
                    long
                >
                    <CategoryList
                        groups={groups}
                        picks={picks}
                        phase={phase}
                        active={active}
                        onGo={(anchor) => {
                            setOpen(false);
                            // After the sheet has gone, or it holds the page.
                            requestAnimationFrame(() => goToCategory(anchor));
                        }}
                    />
                </Popup>
            )}
        </>
    );
};

export default AwardsNav;
