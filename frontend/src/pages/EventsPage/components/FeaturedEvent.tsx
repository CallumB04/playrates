import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { eventPath, type EventSummary } from "@playrates/shared";
import ArtBackdrop from "../../../components/game/ArtBackdrop";
import Countdown from "../../../components/events/Countdown";
import EventDate from "../../../components/events/EventDate";
import EventLogo from "../../../components/events/EventLogo";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cardClass } from "../../../components/ui/cardClass";
import { eventAction } from "../../../lib/events";

/**
 * The event that's on, or on next: home's band given a little more room,
 * for its logo, a larger name and a way to watch. Its art carries it, at
 * the far end, where the actions stand on surfaces of their own.
 */
const FeaturedEvent = ({ event }: { event: EventSummary }) => (
    <section
        aria-labelledby="featured-event"
        className={cardClass(
            "relative isolate flex flex-col gap-6 overflow-hidden p-5 transition-colors hover:border-strong sm:p-8 lg:flex-row lg:items-end lg:justify-between",
            { padding: "none" }
        )}
    >
        <ArtBackdrop url={event.artworkUrl} fade="banner" />
        {/* The whole card opens the event. A layer of its own rather than
            the button stretched, which the button's press would shrink
            mid-click. Out of the tab order: the button is the way in for a
            keyboard. */}
        <Link
            to={eventPath(event.slug)}
            tabIndex={-1}
            aria-hidden
            className="absolute inset-0"
        />
        <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-3">
                {event.logo && (
                    <EventLogo
                        logo={event.logo}
                        className="h-8 text-content sm:h-10"
                    />
                )}
                <h2
                    id="featured-event"
                    className="font-display text-title text-content sm:text-display"
                >
                    {event.name}
                </h2>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
                <EventDate
                    iso={event.startsAt}
                    past={event.timing === "past"}
                />
                <Countdown event={event} />
            </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {event.watchUrl && (
                <a
                    href={event.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass(
                        "secondary",
                        "relative z-10 w-full sm:w-auto"
                    )}
                >
                    {event.timing === "live" ? "Watch live" : "Where to watch"}
                    <ExternalLink size={14} aria-hidden />
                </a>
            )}
            <Link
                to={eventPath(event.slug)}
                className={buttonClass(
                    "primary",
                    "relative z-10 w-full sm:w-auto"
                )}
            >
                {eventAction(event)}
                <ArrowRight size={16} aria-hidden />
            </Link>
        </div>
    </section>
);

export default FeaturedEvent;
