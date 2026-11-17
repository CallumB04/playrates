import { ExternalLink } from "lucide-react";
import { eventTrail, type EventDetail } from "@playrates/shared";
import Breadcrumbs from "../../../components/ui/Breadcrumbs";
import EventLogo from "../../../components/events/EventLogo";
import Countdown from "../../../components/events/Countdown";
import EventDate from "../../../components/events/EventDate";
import { buttonClass } from "../../../components/ui/buttonClass";
import { formatWeekdayTime } from "../../../lib/format";
import { headlineOf } from "../../../lib/events";
import HeadlineWinner from "./HeadlineWinner";

/** Just the host, for a link that says where it goes. */
const hostOf = (url: string) => {
    try {
        return new URL(url).host.replace(/^www\./, "");
    } catch {
        return url;
    }
};

/**
 * The top of an event's page, whatever its kind: its own logo where it has
 * one, its name, when it is and where to watch it.
 */
const EventHero = ({ event }: { event: EventDetail }) => {
    const past = event.timing === "past";
    const headline = event.awards ? headlineOf(event.awards.categories) : null;
    const won = past ? headline?.nominees.find((n) => n.won) : undefined;
    const facts = [
        // Once it's on or over, the countdown's line and the date say it.
        ...(event.endsAt && event.timing === "upcoming"
            ? [
                  {
                      label: "Runs",
                      value: `${formatWeekdayTime(event.startsAt)} to ${formatWeekdayTime(event.endsAt)}`,
                  },
              ]
            : []),
    ];
    return (
        <header className="flex flex-col gap-5">
            <Breadcrumbs trail={eventTrail(event)} />
            {event.logo && (
                <EventLogo
                    logo={event.logo}
                    className="h-12 text-content sm:h-16 lg:h-20"
                />
            )}
            <div className="flex flex-col gap-3">
                <h1 className="font-display text-display text-content on-backdrop">
                    {event.name}
                </h1>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
                <EventDate iso={event.startsAt} past={past} size="lg" />
                {/* Over, an awards night's answer is worth more beside its
                    date than the time it ended. */}
                {won && headline ? (
                    <HeadlineWinner award={headline.name} winner={won} />
                ) : (
                    <Countdown event={event} size="lg" />
                )}
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
                {facts.map((fact) => (
                    <div key={fact.label}>
                        <dt className="text-label-sm text-content-muted on-backdrop">
                            {fact.label}
                        </dt>
                        <dd className="text-body-sm font-medium text-content">
                            {fact.value}
                        </dd>
                    </div>
                ))}
            </dl>
            {event.watchUrl && event.timing !== "past" && (
                <a
                    href={event.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass(
                        event.timing === "live" ? "primary" : "secondary",
                        "w-full sm:w-fit"
                    )}
                >
                    {event.timing === "live" ? "Watch live" : "Where to watch"}
                    <span className="text-label-sm opacity-75">
                        {hostOf(event.watchUrl)}
                    </span>
                    <ExternalLink size={14} aria-hidden />
                </a>
            )}
        </header>
    );
};

export default EventHero;
