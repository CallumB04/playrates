import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { eventPath, type EventSummary } from "@playrates/shared";
import ArtBackdrop from "../../../components/game/ArtBackdrop";
import EventDate from "../../../components/events/EventDate";
import EventLogo from "../../../components/events/EventLogo";
import { cardClass } from "../../../components/ui/cardClass";
import { eventAction } from "../../../lib/events";

/** An event among others: its art and logo, its date, name and line, and
 *  what there is to do there. Art over the words on a phone, beside them from
 *  sm, so a tile stays short. */
const EventTile = ({ event }: { event: EventSummary }) => (
    <li>
        <Link
            to={eventPath(event.slug)}
            className={cardClass(
                "group grid h-full overflow-hidden transition-colors hover:border-strong sm:grid-cols-[11rem_minmax(0,1fr)]",
                { padding: "none" }
            )}
        >
            <div className="relative isolate flex h-24 items-end overflow-hidden px-4 pb-3 sm:h-auto sm:items-center sm:justify-center sm:p-5">
                <ArtBackdrop url={event.artworkUrl} fade="panel" />
                {event.logo && (
                    <EventLogo
                        logo={event.logo}
                        className="h-7 text-content sm:h-9"
                    />
                )}
            </div>
            {/* On a phone the action takes a line of its own; wider, it
                stands at the far end, the words centred between. */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:px-5">
                <EventDate
                    iso={event.startsAt}
                    past={event.timing === "past"}
                    size="sm"
                />
                <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="font-display text-[16px] font-semibold text-content sm:text-[19px]">
                        {event.name}
                    </h3>
                    {event.tagline && (
                        <p className="text-[13px] text-content-secondary">
                            {event.tagline}
                        </p>
                    )}
                </div>
                <span className="col-span-2 inline-flex items-center gap-1 text-body-sm font-semibold whitespace-nowrap text-brand-text sm:col-span-1">
                    {eventAction(event)}
                    <ArrowRight
                        size={14}
                        aria-hidden
                        className="transition-transform duration-200 ease-[var(--ease-glide)] group-hover:translate-x-1 motion-reduce:transition-none"
                    />
                </span>
            </div>
        </Link>
    </li>
);

export default EventTile;
