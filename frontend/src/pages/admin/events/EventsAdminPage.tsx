import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink, Megaphone } from "lucide-react";
import { eventPath, type EventDetail } from "@playrates/shared";
import {
    addAdminCategory,
    createAdminEvent,
    publishAdminEvent,
    reorderAdminCategories,
    updateAdminEvent,
} from "../../../api";
import {
    useAdminEvent,
    useAdminEventChange,
    useAdminEvents,
} from "../../../hooks/queries/useEvents";
import { useNotify } from "../../../contexts/NotificationContext";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import { Input } from "../../../components/ui/Input";
import Toggle from "../../../components/ui/Toggle";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cardClass } from "../../../components/ui/cardClass";
import { cn } from "../../../lib/cn";
import { formatDate } from "../../../lib/format";
import AdminPageHeader from "../components/AdminPageHeader";
import EventForm from "./EventForm";
import CategoryPanel from "./CategoryPanel";
import RevealsPanel from "./RevealsPanel";
import { announceHref, moved, slugify, statusLabel } from "./lib/eventAdmin";

const AddCategory = ({ event }: { event: EventDetail }) => {
    const [name, setName] = useState("");
    const [section, setSection] = useState("");
    const [headline, setHeadline] = useState(
        (event.awards?.categories.length ?? 0) === 0
    );
    const notify = useNotify();
    const add = useAdminEventChange(() =>
        addAdminCategory(event.id, {
            name: name.trim(),
            slug: slugify(name),
            blurb: "",
            section: section.trim(),
            headline,
        })
    );
    const submit = (e: FormEvent) => {
        e.preventDefault();
        add.mutate(undefined, {
            // The section stays, for the next of its categories.
            onSuccess: () => {
                setName("");
                setHeadline(false);
            },
            onError: () => notify("That category is there already", "error"),
        });
    };
    return (
        <form
            onSubmit={submit}
            className={cardClass("flex flex-col gap-3", { tone: "accent" })}
        >
            <Field label="Add a category">
                {(a11y) => (
                    <Input
                        {...a11y}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Best Narrative"
                        maxLength={120}
                    />
                )}
            </Field>
            <Field label="Section" help="Optional, like Craft or Genres.">
                {(a11y) => (
                    <Input
                        {...a11y}
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        maxLength={60}
                    />
                )}
            </Field>
            <Toggle
                checked={headline}
                onChange={setHeadline}
                label="The headline award"
            />
            <Button
                type="submit"
                disabled={!slugify(name) || add.isPending}
                className="w-full sm:w-auto sm:self-start"
            >
                Add category
            </Button>
        </form>
    );
};

const Editor = ({ id }: { id: number }) => {
    const { data: event } = useAdminEvent(id);
    const notify = useNotify();
    const save = useAdminEventChange(
        (input: Parameters<typeof updateAdminEvent>[1]) =>
            updateAdminEvent(id, input)
    );
    const publish = useAdminEventChange((published: boolean) =>
        publishAdminEvent(id, published)
    );
    const reorder = useAdminEventChange((ids: number[]) =>
        reorderAdminCategories(id, ids)
    );

    if (!event) return <TextSkeleton lines={6} />;
    const categories = event.awards?.categories ?? [];
    const categoryIds = categories.map((c) => c.id);

    return (
        <div className="flex flex-col gap-6">
            <section className={cardClass("flex flex-col gap-4")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-display text-section text-content">
                            {event.name}
                        </h2>
                        <p className="text-label-sm text-content-muted">
                            {statusLabel(event)}
                            {event.awards &&
                                ` · ${event.awards.categoryCount} categories`}
                            {event.showcase &&
                                ` · ${event.showcase.revealCount} reveals`}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Toggle
                            checked={event.publishedAt !== null}
                            onChange={(published) =>
                                publish.mutate(published, {
                                    onSuccess: () =>
                                        notify(
                                            published
                                                ? "It’s live"
                                                : "Back to a draft",
                                            "success"
                                        ),
                                })
                            }
                            label="Published"
                        />
                        {event.publishedAt && (
                            <>
                                <Link
                                    to={eventPath(event.slug)}
                                    className={buttonClass(
                                        "secondary",
                                        "w-full sm:w-auto",
                                        "sm"
                                    )}
                                >
                                    View
                                    <ExternalLink size={14} aria-hidden />
                                </Link>
                                <Link
                                    to={announceHref(event)}
                                    className={buttonClass(
                                        "primary",
                                        "w-full sm:w-auto",
                                        "sm"
                                    )}
                                >
                                    <Megaphone size={14} aria-hidden />
                                    Announce
                                </Link>
                            </>
                        )}
                    </div>
                </div>
                <details>
                    <summary className="cursor-pointer text-body-sm text-content-secondary">
                        Details and dates
                    </summary>
                    <div className="pt-4">
                        <EventForm
                            key={event.id}
                            event={event}
                            submitLabel="Save details"
                            isPending={save.isPending}
                            onSubmit={(input) =>
                                save.mutate(input, {
                                    onSuccess: () => notify("Saved", "success"),
                                    onError: () =>
                                        notify("That didn’t save", "error"),
                                })
                            }
                        />
                    </div>
                </details>
            </section>

            {categories.map((category, i) => (
                <CategoryPanel
                    key={category.id}
                    event={event}
                    category={category}
                    index={i}
                    onMove={(by) => reorder.mutate(moved(categoryIds, i, by))}
                />
            ))}
            {event.awards && <AddCategory event={event} />}
            {event.showcase && (
                <RevealsPanel event={event} showcase={event.showcase} />
            )}
        </div>
    );
};

/**
 * Events from admin: make one, fill in its categories and nominees as they
 * are announced, publish it, then mark the winners on the night.
 */
const EventsAdminPage = () => {
    const [params, setParams] = useSearchParams();
    const selected = Number(params.get("event")) || null;
    const { data: events, isLoading } = useAdminEvents();
    const [creating, setCreating] = useState(false);
    const notify = useNotify();
    const create = useAdminEventChange(createAdminEvent);
    const select = (id: number) => setParams({ event: String(id) });

    return (
        <>
            <AdminPageHeader
                title="Events"
                description="Make an event, fill in its part (an awards night’s categories, a showcase’s reveals) and publish it when it’s ready."
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => setCreating((open) => !open)}
                        className="w-full sm:w-auto"
                    >
                        New event
                    </Button>
                }
            />
            <div className="flex flex-col gap-6">
                {creating && (
                    <section className={cardClass()}>
                        <EventForm
                            submitLabel="Make it"
                            isPending={create.isPending}
                            onSubmit={(input) =>
                                create.mutate(input, {
                                    onSuccess: (event) => {
                                        setCreating(false);
                                        select(event.id);
                                    },
                                    onError: () =>
                                        notify(
                                            "That address is taken",
                                            "error"
                                        ),
                                })
                            }
                        />
                    </section>
                )}
                {isLoading ? (
                    <TextSkeleton lines={3} />
                ) : (events ?? []).length === 0 ? (
                    <EmptyNote>No events yet.</EmptyNote>
                ) : (
                    <nav aria-label="Events" className="flex flex-wrap gap-2">
                        {(events ?? []).map((event) => (
                            <button
                                key={event.id}
                                type="button"
                                aria-current={
                                    event.id === selected ? "true" : undefined
                                }
                                onClick={() => select(event.id)}
                                className={cn(
                                    buttonClass(
                                        event.id === selected
                                            ? "primary"
                                            : "secondary",
                                        "w-full sm:w-auto"
                                    )
                                )}
                            >
                                {event.name}
                                <span className="text-label-sm opacity-80">
                                    {formatDate(event.startsAt)} ·{" "}
                                    {statusLabel(event)}
                                </span>
                            </button>
                        ))}
                    </nav>
                )}
                {selected && <Editor key={selected} id={selected} />}
            </div>
        </>
    );
};

export default EventsAdminPage;
