import type { AwardsDetail } from "@playrates/shared";
import { cardClass } from "../../../components/ui/cardClass";
import { groupCategories } from "../../../lib/events";

/**
 * An awards night out before its nominees: what's coming, and every award
 * there'll be to pick in, by section, so the page has something to read
 * until they're in.
 */
const AwaitingNominees = ({ awards }: { awards: AwardsDetail }) => {
    const groups = groupCategories(awards.categories, { includeEmpty: true });
    return (
        <section
            aria-labelledby="awaiting-nominees"
            className="flex flex-col gap-8"
        >
            <div className={cardClass("flex flex-col gap-1")}>
                <h2
                    id="awaiting-nominees"
                    className="text-body font-semibold text-content"
                >
                    The nominees are on their way
                </h2>
                <p className="text-body-sm text-content-secondary">
                    Every award is below. Once the nominees are in, you can pick
                    who you think wins each one.
                </p>
            </div>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                    <div
                        key={`${group.section}-${group.lead}`}
                        className={
                            group.lead
                                ? "flex flex-col gap-1 sm:col-span-2 lg:col-span-3"
                                : "flex flex-col gap-2"
                        }
                    >
                        {group.lead ? (
                            group.categories.map((category) => (
                                <div key={category.id}>
                                    <h3 className="font-display text-title text-content">
                                        {category.name}
                                    </h3>
                                    {category.blurb && (
                                        <p className="text-body-sm text-content-secondary">
                                            {category.blurb}
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <>
                                <h3 className="text-label-sm font-medium tracking-[0.14em] text-content-muted uppercase">
                                    {group.section || "More awards"}
                                </h3>
                                <ul className="flex flex-col gap-1.5">
                                    {group.categories.map((category) => (
                                        <li
                                            key={category.id}
                                            className="text-body-sm text-content"
                                        >
                                            {category.name}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default AwaitingNominees;
