import { Fragment } from "react";
import { eventLogo, type EventSummary } from "@playrates/shared";
import { cn } from "../../lib/cn";

/** Whose show it is, and whose name and logo these are: under anything
 *  that carries them. */
const EventCredit = ({
    events,
    className,
}: {
    events: Pick<EventSummary, "organiser" | "organiserUrl" | "logo">[];
    className?: string;
}) => {
    const organisers = new Map<string, string | null>();
    const credits = new Set<string>();
    for (const event of events) {
        if (event.organiser) {
            organisers.set(event.organiser, event.organiserUrl);
        }
        const logo = eventLogo(event.logo);
        if (logo) credits.add(logo.credit);
    }
    if (organisers.size === 0 && credits.size === 0) return null;
    const names = [...organisers];
    return (
        <div
            className={cn(
                "flex flex-col gap-1 border-t border-subtle pt-5 text-label-sm text-content-muted",
                className
            )}
        >
            {/* One sentence for every organiser on the page, not a line
                each: on the events page they stacked into a wall. */}
            {names.length > 0 && (
                <p>
                    PlayRates isn’t affiliated with or endorsed by{" "}
                    {names.map(([name, url], i) => (
                        <Fragment key={name}>
                            {i > 0 && (i === names.length - 1 ? " or " : ", ")}
                            {url ? (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2 hover:text-content"
                                >
                                    {name}
                                </a>
                            ) : (
                                name
                            )}
                        </Fragment>
                    ))}
                    .
                </p>
            )}
            {credits.size > 0 && <p>{[...credits].join(" ")}</p>}
        </div>
    );
};

export default EventCredit;
