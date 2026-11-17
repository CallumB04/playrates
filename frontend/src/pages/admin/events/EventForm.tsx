import { useState, type FormEvent } from "react";
import {
    AdminEventInputSchema,
    EVENT_KIND_LABELS,
    EVENT_KINDS,
    EVENT_LOGOS,
    type AdminEventInput,
    type EventDetail,
    type EventKind,
    type EventLogoKey,
} from "@playrates/shared";
import Button from "../../../components/ui/Button";
import Dropdown from "../../../components/ui/Dropdown";
import Field from "../../../components/ui/Field";
import { Input, Textarea } from "../../../components/ui/Input";
import { fromLocalInput, slugify, toLocalInput } from "./lib/eventAdmin";

const KIND_OPTIONS = EVENT_KINDS.map((value) => ({
    value,
    label: EVENT_KIND_LABELS[value],
}));

const NO_LOGO = "none";
const LOGO_OPTIONS = [
    { value: NO_LOGO, label: "None" },
    ...Object.entries(EVENT_LOGOS).map(([value, logo]) => ({
        value,
        label: logo.name,
    })),
];

/** An event's frame, whatever its kind, and its kind's own settings. */
const EventForm = ({
    event,
    submitLabel,
    isPending,
    onSubmit,
}: {
    event?: EventDetail;
    submitLabel: string;
    isPending: boolean;
    onSubmit: (input: AdminEventInput) => void;
}) => {
    const [kind, setKind] = useState<EventKind>(event?.kind ?? "awards");
    const [name, setName] = useState(event?.name ?? "");
    const [slug, setSlug] = useState(event?.slug ?? "");
    const [tagline, setTagline] = useState(event?.tagline ?? "");
    const [about, setAbout] = useState(event?.about ?? "");
    const [organiser, setOrganiser] = useState(event?.organiser ?? "");
    const [organiserUrl, setOrganiserUrl] = useState(event?.organiserUrl ?? "");
    const [watchUrl, setWatchUrl] = useState(event?.watchUrl ?? "");
    const [logo, setLogo] = useState<string>(event?.logo ?? NO_LOGO);
    const [startsAt, setStartsAt] = useState(
        event ? toLocalInput(event.startsAt) : ""
    );
    const [endsAt, setEndsAt] = useState(
        event?.endsAt ? toLocalInput(event.endsAt) : ""
    );
    const [closeAt, setCloseAt] = useState(
        event?.awards ? toLocalInput(event.awards.picksCloseAt) : ""
    );

    const start = fromLocalInput(startsAt);
    const parsed = AdminEventInputSchema.safeParse({
        kind,
        name: name.trim(),
        slug: slug || slugify(name),
        tagline: tagline.trim(),
        about: about.trim(),
        organiser: organiser.trim(),
        organiserUrl: organiserUrl.trim() || null,
        watchUrl: watchUrl.trim() || null,
        logo: logo === NO_LOGO ? null : (logo as EventLogoKey),
        startsAt: start,
        endsAt: fromLocalInput(endsAt),
        // Picks close as the show starts unless told otherwise.
        awards:
            kind === "awards"
                ? { picksCloseAt: fromLocalInput(closeAt) ?? start }
                : null,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (parsed.success) onSubmit(parsed.data);
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kind" help="It can’t change once it’s made.">
                    {(a11y) => (
                        <Dropdown
                            id={a11y.id}
                            options={KIND_OPTIONS}
                            value={kind}
                            onChange={(value) => setKind(value as EventKind)}
                            disabled={!!event}
                        />
                    )}
                </Field>
                <Field label="Logo" help="Only logos the site carries.">
                    {(a11y) => (
                        <Dropdown
                            id={a11y.id}
                            options={LOGO_OPTIONS}
                            value={logo}
                            onChange={setLogo}
                        />
                    )}
                </Field>
                <Field label="Name">
                    {(a11y) => (
                        <Input
                            {...a11y}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="The Game Awards 2026"
                            maxLength={120}
                        />
                    )}
                </Field>
                <Field
                    label="Address"
                    help={`/events/${slug || slugify(name) || "…"}`}
                >
                    {(a11y) => (
                        <Input
                            {...a11y}
                            value={slug}
                            onChange={(e) => setSlug(slugify(e.target.value))}
                            placeholder={
                                slugify(name) || "the-game-awards-2026"
                            }
                            maxLength={80}
                        />
                    )}
                </Field>
            </div>
            <Field
                label="Tagline"
                help="A few words, said the way you’d say it. Shown on its card, and to search engines."
            >
                {(a11y) => (
                    <Input
                        {...a11y}
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        maxLength={160}
                    />
                )}
            </Field>
            <Field
                label="About"
                help="Optional. A blank line starts a new paragraph."
            >
                {(a11y) => (
                    <Textarea
                        {...a11y}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={4}
                        maxLength={2000}
                    />
                )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Starts">
                    {(a11y) => (
                        <Input
                            {...a11y}
                            type="datetime-local"
                            value={startsAt}
                            onChange={(e) => setStartsAt(e.target.value)}
                        />
                    )}
                </Field>
                <Field
                    label="Ends"
                    help="Leave empty for a show over in an evening."
                >
                    {(a11y) => (
                        <Input
                            {...a11y}
                            type="datetime-local"
                            value={endsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
                        />
                    )}
                </Field>
                {kind === "awards" && (
                    <Field
                        label="Picks close"
                        help="When it starts, if left empty."
                    >
                        {(a11y) => (
                            <Input
                                {...a11y}
                                type="datetime-local"
                                value={closeAt}
                                onChange={(e) => setCloseAt(e.target.value)}
                            />
                        )}
                    </Field>
                )}
                <Field label="Run by">
                    {(a11y) => (
                        <Input
                            {...a11y}
                            value={organiser}
                            onChange={(e) => setOrganiser(e.target.value)}
                            placeholder="The Game Awards"
                            maxLength={120}
                        />
                    )}
                </Field>
                <Field label="Their site">
                    {(a11y) => (
                        <Input
                            {...a11y}
                            type="url"
                            value={organiserUrl}
                            onChange={(e) => setOrganiserUrl(e.target.value)}
                            placeholder="https://thegameawards.com"
                            maxLength={300}
                        />
                    )}
                </Field>
                <Field label="Where to watch">
                    {(a11y) => (
                        <Input
                            {...a11y}
                            type="url"
                            value={watchUrl}
                            onChange={(e) => setWatchUrl(e.target.value)}
                            placeholder="https://thegameawards.com"
                            maxLength={300}
                        />
                    )}
                </Field>
            </div>
            <Button
                type="submit"
                disabled={!parsed.success || isPending}
                className="w-full sm:w-auto sm:self-start"
            >
                {submitLabel}
            </Button>
        </form>
    );
};

export default EventForm;
