import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Trash2, Trophy } from "lucide-react";
import type { AwardCategory, EventDetail } from "@playrates/shared";
import {
    addAdminNominee,
    deleteAdminCategory,
    deleteAdminNominee,
    reorderAdminNominees,
    setAdminWinner,
    updateAdminCategory,
} from "../../../api";
import { useAdminEventChange } from "../../../hooks/queries/useEvents";
import { useNotify } from "../../../contexts/NotificationContext";
import GamePicker, {
    type PickedGame,
} from "../../../components/community/GamePicker";
import GameCover from "../../../components/game/GameCover";
import Button from "../../../components/ui/Button";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";
import Field from "../../../components/ui/Field";
import { Input } from "../../../components/ui/Input";
import Toggle from "../../../components/ui/Toggle";
import { cardClass } from "../../../components/ui/cardClass";
import { cn } from "../../../lib/cn";
import { moved, slugify } from "./lib/eventAdmin";
import NomineePicture from "./NomineePicture";

const ICON_BUTTON =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-content-muted transition-colors hover:bg-surface-hover hover:text-content disabled:opacity-40 sm:size-9";

/** A nominee in: a game, a person or creator's name, or both. */
const AddNominee = ({ category }: { category: AwardCategory }) => {
    const [game, setGame] = useState<PickedGame | null>(null);
    const [label, setLabel] = useState("");
    const [detail, setDetail] = useState("");
    const notify = useNotify();
    const add = useAdminEventChange(() =>
        addAdminNominee(category.id, {
            gameId: game?.id ?? null,
            label: label.trim() || null,
            detail: detail.trim() || null,
        })
    );

    const submit = (e: FormEvent) => {
        e.preventDefault();
        add.mutate(undefined, {
            onSuccess: () => {
                setGame(null);
                setLabel("");
                setDetail("");
            },
            onError: () =>
                notify("That nominee didn’t go in. Already there?", "error"),
        });
    };

    return (
        <form
            onSubmit={submit}
            className="flex flex-col gap-3 border-t border-subtle pt-4"
        >
            <Field label="Game">
                {(a11y) => (
                    <GamePicker
                        {...a11y}
                        value={game}
                        onChange={setGame}
                        exclude={category.nominees.flatMap((n) =>
                            n.game ? [n.game.id] : []
                        )}
                    />
                )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="Name"
                    help="For a person or a creator. Leave empty for the game itself."
                >
                    {(a11y) => (
                        <Input
                            {...a11y}
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            maxLength={120}
                        />
                    )}
                </Field>
                <Field
                    label="Detail"
                    help="Optional: a role, a studio, a channel."
                >
                    {(a11y) => (
                        <Input
                            {...a11y}
                            value={detail}
                            onChange={(e) => setDetail(e.target.value)}
                            maxLength={120}
                        />
                    )}
                </Field>
            </div>
            <Button
                type="submit"
                variant="secondary"
                disabled={(!game && !label.trim()) || add.isPending}
                className="w-full sm:w-auto sm:self-start"
            >
                Add nominee
            </Button>
        </form>
    );
};

const CategoryDetails = ({
    category,
    onDone,
}: {
    category: AwardCategory;
    onDone: () => void;
}) => {
    const [name, setName] = useState(category.name);
    const [blurb, setBlurb] = useState(category.blurb);
    const [section, setSection] = useState(category.section);
    const [headline, setHeadline] = useState(category.headline);
    const save = useAdminEventChange(() =>
        updateAdminCategory(category.id, {
            name: name.trim(),
            slug: slugify(name),
            blurb: blurb.trim(),
            section: section.trim(),
            headline,
        })
    );
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                save.mutate(undefined, { onSuccess: onDone });
            }}
            className="flex flex-col gap-3"
        >
            <Field label="Name">
                {(a11y) => (
                    <Input
                        {...a11y}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={120}
                    />
                )}
            </Field>
            <Field label="Blurb">
                {(a11y) => (
                    <Input
                        {...a11y}
                        value={blurb}
                        onChange={(e) => setBlurb(e.target.value)}
                        maxLength={300}
                    />
                )}
            </Field>
            <Field
                label="Section"
                help="A heading to group it under, like Craft or Genres."
            >
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
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                    type="submit"
                    disabled={!name.trim() || save.isPending}
                    className="w-full sm:w-auto"
                >
                    Save
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onDone}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
};

/** One category: its nominees in order, its winner, and adding more. */
const CategoryPanel = ({
    event,
    category,
    index,
    onMove,
}: {
    event: EventDetail;
    category: AwardCategory;
    index: number;
    onMove: (by: -1 | 1) => void;
}) => {
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const notify = useNotify();
    const ids = category.nominees.map((n) => n.id);
    const reorder = useAdminEventChange((next: number[]) =>
        reorderAdminNominees(category.id, next)
    );
    const remove = useAdminEventChange((id: number) => deleteAdminNominee(id));
    const winner = useAdminEventChange(
        ({ id, won }: { id: number; won: boolean }) => setAdminWinner(id, won)
    );
    const drop = useAdminEventChange(() => deleteAdminCategory(category.id));

    return (
        <section className={cardClass("flex flex-col gap-4")}>
            <header className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="font-display text-section text-content">
                        {category.name}
                    </h3>
                    <p className="text-label-sm text-content-muted">
                        {category.headline
                            ? "Headline award · "
                            : category.section
                              ? `${category.section} · `
                              : ""}
                        {category.nominees.length} nominees
                    </p>
                </div>
                <button
                    type="button"
                    aria-label={`Move ${category.name} up`}
                    disabled={index === 0}
                    onClick={() => onMove(-1)}
                    className={ICON_BUTTON}
                >
                    <ArrowUp size={16} aria-hidden />
                </button>
                <button
                    type="button"
                    aria-label={`Move ${category.name} down`}
                    disabled={
                        index === (event.awards?.categories.length ?? 0) - 1
                    }
                    onClick={() => onMove(1)}
                    className={ICON_BUTTON}
                >
                    <ArrowDown size={16} aria-hidden />
                </button>
                <button
                    type="button"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => setDeleting(true)}
                    className={ICON_BUTTON}
                >
                    <Trash2 size={16} aria-hidden />
                </button>
            </header>

            {editing ? (
                <CategoryDetails
                    category={category}
                    onDone={() => setEditing(false)}
                />
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="self-start"
                >
                    Edit name, blurb and section
                </Button>
            )}

            {category.nominees.length > 0 && (
                <ol className="flex flex-col divide-y divide-subtle">
                    {category.nominees.map((nominee, i) => (
                        <li
                            key={nominee.id}
                            className="flex items-center gap-3 py-2"
                        >
                            {nominee.game ? (
                                <GameCover
                                    coverUrl={nominee.game.coverUrl}
                                    title=""
                                    sizes="40px"
                                    className="aspect-3/4 w-10 shrink-0 rounded-sm"
                                />
                            ) : (
                                <NomineePicture nominee={nominee} />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-body-sm font-medium text-content">
                                    {nominee.label ?? nominee.game?.title}
                                </p>
                                <p className="truncate text-label-sm text-content-muted">
                                    {[
                                        nominee.label
                                            ? nominee.game?.title
                                            : null,
                                        nominee.detail,
                                        `${nominee.picks} picks`,
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-pressed={nominee.won}
                                aria-label={
                                    nominee.won
                                        ? `${nominee.label ?? nominee.game?.title} won. Unmark`
                                        : `Mark ${nominee.label ?? nominee.game?.title} as the winner`
                                }
                                onClick={() =>
                                    winner.mutate({
                                        id: nominee.id,
                                        won: !nominee.won,
                                    })
                                }
                                className={cn(
                                    ICON_BUTTON,
                                    nominee.won &&
                                        "bg-brand-subtle text-brand-text"
                                )}
                            >
                                <Trophy size={16} aria-hidden />
                            </button>
                            <button
                                type="button"
                                aria-label="Move up"
                                disabled={i === 0}
                                onClick={() =>
                                    reorder.mutate(moved(ids, i, -1))
                                }
                                className={ICON_BUTTON}
                            >
                                <ArrowUp size={16} aria-hidden />
                            </button>
                            <button
                                type="button"
                                aria-label="Remove"
                                onClick={() =>
                                    remove.mutate(nominee.id, {
                                        onError: () =>
                                            notify(
                                                "It didn’t come out",
                                                "error"
                                            ),
                                    })
                                }
                                className={ICON_BUTTON}
                            >
                                <Trash2 size={16} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ol>
            )}

            <AddNominee category={category} />

            {deleting && (
                <ConfirmPopup
                    title={`Delete ${category.name}?`}
                    body="Its nominees go with it, and every pick made in it."
                    confirmLabel="Delete it"
                    isPending={drop.isPending}
                    onConfirm={() =>
                        drop.mutate(undefined, {
                            onSuccess: () => setDeleting(false),
                        })
                    }
                    onClose={() => setDeleting(false)}
                />
            )}
        </section>
    );
};

export default CategoryPanel;
