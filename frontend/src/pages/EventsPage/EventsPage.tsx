import { EVENTS_WORDS } from "@playrates/shared";
import { useEvents } from "../../hooks/queries/useEvents";
import { usePageMeta } from "../../hooks/usePageMeta";
import PageHeader from "../../components/ui/PageHeader";
import EmptyPlate from "../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../components/ui/Skeleton";
import EventCredit from "../../components/events/EventCredit";
import FeaturedEvent from "./components/FeaturedEvent";
import EventTile from "./components/EventTile";

const GRID = "grid gap-3";

/** What's on: the event on now or next leads, then the rest to come, then
 *  the ones gone. */
const EventsPage = () => {
    const { data: events, isLoading } = useEvents();
    usePageMeta({
        title: EVENTS_WORDS.title,
        description: EVENTS_WORDS.description,
    });

    // One on now leads, then the soonest to come.
    const ahead = (events ?? [])
        .filter((e) => e.timing !== "past")
        .sort(
            (a, b) =>
                Number(b.timing === "live") - Number(a.timing === "live") ||
                Date.parse(a.startsAt) - Date.parse(b.startsAt)
        );
    const [featured, ...later] = ahead;
    const past = (events ?? []).filter((e) => e.timing === "past");

    return (
        <section className="flex flex-col gap-10">
            <PageHeader
                title={EVENTS_WORDS.title}
                note={EVENTS_WORDS.description}
            />
            {isLoading ? (
                <TextSkeleton lines={4} />
            ) : (events ?? []).length === 0 ? (
                <EmptyPlate
                    title="Nothing on yet"
                    body="When something big is happening in gaming, it’ll be here."
                />
            ) : (
                <>
                    {featured && <FeaturedEvent event={featured} />}
                    {later.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <h2 className="font-display text-section text-content">
                                Coming up
                            </h2>
                            <ul className={GRID}>
                                {later.map((event) => (
                                    <EventTile key={event.id} event={event} />
                                ))}
                            </ul>
                        </div>
                    )}
                    {past.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <h2 className="font-display text-section text-content">
                                Past events
                            </h2>
                            <ul className={GRID}>
                                {past.map((event) => (
                                    <EventTile key={event.id} event={event} />
                                ))}
                            </ul>
                        </div>
                    )}
                    <EventCredit events={events ?? []} />
                </>
            )}
        </section>
    );
};

export default EventsPage;
