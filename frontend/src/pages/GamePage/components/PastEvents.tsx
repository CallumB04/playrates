import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { eventPath, type GameEventEntry } from "@playrates/shared";
import ArtBackdrop from "../../../components/game/ArtBackdrop";
import EventDate from "../../../components/events/EventDate";
import EventLogo from "../../../components/events/EventLogo";
import { cardClass } from "../../../components/ui/cardClass";
import { cn } from "../../../lib/cn";
import { pastSummary } from "../lib/gameEvents";

/**
 * Events this game was part of that are over, lower down its page. Each a
 * card of its own with the event's art and logo, and its result up front:
 * a win in purple, with a medal, and every award it won or was up for.
 */
const PastEvents = ({
    entries,
    art,
}: {
    entries: GameEventEntry[];
    art: Map<string, string | null>;
}) => (
    <section aria-labelledby="past-events" className="flex flex-col gap-3">
        <h2 id="past-events" className="font-display text-section text-content">
            Past events
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => {
                const summary = pastSummary(entry);
                return (
                    <li key={entry.event.slug}>
                        <Link
                            to={eventPath(entry.event.slug)}
                            className={cardClass(
                                "group flex h-full flex-col overflow-hidden transition-colors hover:border-strong",
                                {
                                    padding: "none",
                                }
                            )}
                        >
                            <div className="relative isolate flex h-24 items-end overflow-hidden px-4 pb-3">
                                <ArtBackdrop
                                    url={art.get(entry.event.slug)}
                                    fade="down"
                                />
                                {entry.event.logo ? (
                                    <EventLogo
                                        logo={entry.event.logo}
                                        className="h-6 text-content"
                                    />
                                ) : (
                                    <span className="font-display text-body font-semibold text-content">
                                        {entry.event.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-1 flex-col px-4 py-4">
                                <div className="flex items-center gap-4">
                                    <EventDate
                                        iso={entry.event.startsAt}
                                        past
                                        size="sm"
                                    />
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <p
                                            className={cn(
                                                "flex items-center gap-2 font-display text-section",
                                                summary.won
                                                    ? "text-brand-text"
                                                    : "text-content"
                                            )}
                                        >
                                            {summary.won && (
                                                <span
                                                    aria-hidden
                                                    className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-content-on-solid shadow-solid"
                                                >
                                                    <Trophy
                                                        size={13}
                                                        strokeWidth={2.5}
                                                    />
                                                </span>
                                            )}
                                            {summary.title}
                                        </p>
                                        <p className="text-body-sm text-content-secondary">
                                            {summary.tags.join(", ")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </li>
                );
            })}
        </ul>
    </section>
);

export default PastEvents;
