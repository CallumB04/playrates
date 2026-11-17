import { useParams } from "react-router-dom";
import { eventWords } from "@playrates/shared";
import { isNotFound } from "../../api";
import { useEvent } from "../../hooks/queries/useEvents";
import EmptyPlate from "../../components/ui/EmptyPlate";
import Button from "../../components/ui/Button";
import { usePageMeta } from "../../hooks/usePageMeta";
import PageBackdrop, {
    TALL_BACKDROP_OFFSET,
} from "../../components/layout/PageBackdrop";
import EventCredit from "../../components/events/EventCredit";
import { TextSkeleton, TileSkeleton } from "../../components/ui/Skeleton";
import { cn } from "../../lib/cn";
import NotFoundPage from "../NotFoundPage";
import EventHero from "./components/EventHero";
import AwardsSection from "./awards/AwardsSection";
import ShowcaseSection from "./showcase/ShowcaseSection";

/**
 * An event's page: the frame every event shares, with its kind's own part
 * in the middle. A new kind brings its section here beside the others.
 */
const EventPage = () => {
    const { slug = "" } = useParams();
    const { data: event, isLoading, error, refetch } = useEvent(slug);
    const words = event ? eventWords(event) : null;
    usePageMeta({
        title: words?.title ?? null,
        description: words?.description ?? null,
    });

    if (isNotFound(error)) return <NotFoundPage />;
    // Any other failure is a blip, not a missing page.
    if (error) {
        return (
            <EmptyPlate
                title="This event didn’t load"
                body="Something went wrong on our side. Try again in a moment."
                action={
                    <Button variant="secondary" onClick={() => void refetch()}>
                        Try again
                    </Button>
                }
            />
        );
    }

    if (isLoading || !event) {
        return (
            <section className="flex flex-col gap-6">
                <TextSkeleton lines={3} />
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                    {Array.from({ length: 6 }, (_, i) => (
                        <TileSkeleton key={i} />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <article
            className={cn(
                "flex flex-col gap-10",
                event.artworkUrl && TALL_BACKDROP_OFFSET
            )}
        >
            <PageBackdrop url={event.artworkUrl} />
            <EventHero event={event} />
            {event.awards && (
                <AwardsSection event={event} awards={event.awards} />
            )}
            {event.showcase && (
                <ShowcaseSection event={event} showcase={event.showcase} />
            )}
            {event.about && (
                <section
                    aria-labelledby="event-about"
                    className="flex max-w-[64ch] flex-col gap-3"
                >
                    <h2
                        id="event-about"
                        className="font-display text-section text-content"
                    >
                        About {event.name}
                    </h2>
                    {event.about.split(/\n{2,}/).map((paragraph) => (
                        <p
                            key={paragraph}
                            className="text-body text-content-secondary"
                        >
                            {paragraph}
                        </p>
                    ))}
                </section>
            )}
            <EventCredit events={[event]} />
        </article>
    );
};

export default EventPage;
