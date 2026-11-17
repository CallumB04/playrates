import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { eventPath } from "@playrates/shared";
import { useCurrentEvent } from "../../../hooks/queries/useEvents";
import ArtBackdrop from "../../../components/game/ArtBackdrop";
import Countdown from "../../../components/events/Countdown";
import EventDate from "../../../components/events/EventDate";
import EventLogo from "../../../components/events/EventLogo";
import { cardClass } from "../../../components/ui/cardClass";
import { buttonClass } from "../../../components/ui/buttonClass";
import { eventAction } from "../../../lib/events";

/** Home's invitation to the event that's on, while there is one: its name,
 *  when it is and the time to it, in one band. Its art and its large name
 *  set it apart without making it the biggest thing on the page. */
const EventCard = () => {
    const { data: event } = useCurrentEvent();
    if (!event) return null;

    return (
        <section
            aria-labelledby="home-event"
            className={cardClass(
                "relative isolate flex flex-col gap-4 overflow-hidden px-5 py-4 transition-colors hover:border-strong sm:px-6 md:flex-row md:items-center md:gap-6",
                { padding: "none" }
            )}
        >
            <ArtBackdrop url={event.artworkUrl} fade="banner" />
            {/* The whole card opens the event. A layer of its own rather
                than the button stretched, which the button's press would
                shrink mid-click. Out of the tab order: the button is the
                way in for a keyboard. */}
            <Link
                to={eventPath(event.slug)}
                tabIndex={-1}
                aria-hidden
                className="absolute inset-0"
            />
            <div className="flex min-w-0 flex-1 items-center gap-4">
                <EventDate
                    iso={event.startsAt}
                    past={event.timing === "past"}
                    size="sm"
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                    {event.logo && (
                        <EventLogo
                            logo={event.logo}
                            className="h-5 text-content"
                        />
                    )}
                    <h2
                        id="home-event"
                        className="font-display text-section text-balance text-content"
                    >
                        {event.name}
                    </h2>
                </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:justify-end md:gap-5">
                <Countdown event={event} />
                <Link
                    to={eventPath(event.slug)}
                    className={buttonClass(
                        "primary",
                        "relative z-10 w-full shrink-0 sm:w-auto"
                    )}
                >
                    {eventAction(event)}
                    <ArrowRight size={16} aria-hidden />
                </Link>
            </div>
        </section>
    );
};

export default EventCard;
