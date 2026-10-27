import { Link } from "react-router-dom";
import { ArrowBigUp } from "lucide-react";
import { cardClass } from "../ui/Card";
import CoverGrid from "../game/CoverGrid";
import { usePopularLists } from "../../hooks/queries/useLists";
import { formatCount } from "../../lib/format";
import { listPath } from "../../lib/profilePaths";

const SHOWN = 5;

/** The most upvoted public lists, in the side column's own plain card, row
 *  for row like the community card above it. */
const PopularLists = () => {
    const { data } = usePopularLists(SHOWN);
    const lists = data?.data ?? [];
    if (lists.length === 0) return null;

    return (
        <section
            aria-label="Popular lists"
            className={cardClass("flex flex-col pb-1.5", { padding: "none" })}
        >
            <h2 className="px-3 pt-3 pb-1.5 text-label text-content-muted">
                Popular lists
            </h2>
            <ul>
                {lists.map((list) => (
                    <li key={list.id}>
                        <Link
                            to={listPath(list.owner.username, list.id)}
                            className="flex items-center gap-2.5 rounded-sm px-3 py-2 lift hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                        >
                            <CoverGrid
                                covers={list.covers}
                                className="w-8 shrink-0 rounded-xs"
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-body-sm font-medium text-content">
                                    {list.name}
                                </span>
                                <span className="block truncate text-label-sm text-content-muted">
                                    by {list.owner.username} ·{" "}
                                    {formatCount(list.gameCount)}{" "}
                                    {list.gameCount === 1 ? "game" : "games"}
                                </span>
                            </span>
                            <span
                                className="inline-flex shrink-0 items-center gap-1 font-mono text-label-sm text-content-muted"
                                aria-label={`${formatCount(list.voteCount)} upvotes`}
                            >
                                <ArrowBigUp size={13} aria-hidden />
                                {formatCount(list.voteCount)}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default PopularLists;
