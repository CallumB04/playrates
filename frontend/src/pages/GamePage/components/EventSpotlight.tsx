import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { eventPath, type GameEventEntry } from "@playrates/shared";
import ArtBackdrop from "../../../components/game/ArtBackdrop";
import EventDate from "../../../components/events/EventDate";
import EventLogo from "../../../components/events/EventLogo";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cardClass } from "../../../components/ui/cardClass";
import { entryAction, entryLines, wonAt } from "../lib/gameEvents";

/**
 * An event this game is part of that's on or still to come, near the top
 * of its page and dressed as that event: its date, its logo, a picture the
 * page isn't already showing, and what the game is there for.
 */
const EventSpotlight = ({
    entry,
    art,
}: {
    entry: GameEventEntry;
    art: string | null;
}) => {
    const [lead, ...rest] = entryLines(entry);
    const won = wonAt(entry);
    return (
        <section
            aria-label={entry.event.name}
            className={cardClass(
                "relative isolate flex flex-col gap-5 overflow-hidden transition-colors hover:border-strong sm:flex-row sm:items-center sm:justify-between"
            )}
        >
            <ArtBackdrop url={art} />
            {/* The whole card opens the event; the button is the way in
                for a keyboard. */}
            <Link
                to={eventPath(entry.event.slug)}
                tabIndex={-1}
                aria-hidden
                className="absolute inset-0"
            />
            {/* The date beside the logo rather than down the side, so on a
                phone the nominations get the card's whole width. */}
            <div className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center gap-4">
                    <EventDate iso={entry.event.startsAt} size="sm" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                        {entry.event.logo ? (
                            <EventLogo
                                logo={entry.event.logo}
                                className="h-7 text-content"
                            />
                        ) : (
                            <p className="font-display text-section text-content">
                                {entry.event.name}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    {lead && (
                        <p
                            className={
                                won
                                    ? "text-body font-bold text-brand-text"
                                    : "text-body font-semibold text-content"
                            }
                        >
                            {lead}
                        </p>
                    )}
                    {rest.map((line) => (
                        <p
                            key={line}
                            className="text-body-sm text-content-secondary"
                        >
                            {line}
                        </p>
                    ))}
                </div>
            </div>
            <Link
                to={eventPath(entry.event.slug)}
                className={buttonClass(
                    "primary",
                    "relative z-10 w-full shrink-0 sm:w-auto"
                )}
            >
                {entryAction(entry)}
                <ArrowRight size={16} aria-hidden />
            </Link>
        </section>
    );
};

export default EventSpotlight;
