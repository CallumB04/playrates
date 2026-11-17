import { useState, type FormEvent } from "react";
import { ArrowUp, Trash2 } from "lucide-react";
import {
    REVEAL_TAG_LABELS,
    REVEAL_TAGS,
    type EventDetail,
    type RevealTag,
    type ShowcaseDetail,
} from "@playrates/shared";
import {
    addAdminReveal,
    deleteAdminReveal,
    reorderAdminReveals,
} from "../../../api";
import { useAdminEventChange } from "../../../hooks/queries/useEvents";
import { useNotify } from "../../../contexts/NotificationContext";
import GamePicker, {
    type PickedGame,
} from "../../../components/community/GamePicker";
import GameCover from "../../../components/game/GameCover";
import Button from "../../../components/ui/Button";
import Dropdown from "../../../components/ui/Dropdown";
import Field from "../../../components/ui/Field";
import { Input } from "../../../components/ui/Input";
import { cardClass } from "../../../components/ui/cardClass";
import { moved } from "./lib/eventAdmin";

const ICON_BUTTON =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-content-muted transition-colors hover:bg-surface-hover hover:text-content disabled:opacity-40 sm:size-9";

const TAG_OPTIONS = REVEAL_TAGS.map((value) => ({
    value,
    label: REVEAL_TAG_LABELS[value],
}));

/** A showcase's running order: add each reveal as it's shown, live. */
const RevealsPanel = ({
    event,
    showcase,
}: {
    event: EventDetail;
    showcase: ShowcaseDetail;
}) => {
    const [game, setGame] = useState<PickedGame | null>(null);
    const [label, setLabel] = useState("");
    const [tag, setTag] = useState<RevealTag>("premiere");
    const notify = useNotify();
    const ids = showcase.reveals.map((r) => r.id);
    const add = useAdminEventChange(() =>
        addAdminReveal(event.id, {
            gameId: game?.id ?? null,
            label: label.trim() || null,
            tag,
        })
    );
    const remove = useAdminEventChange((id: number) => deleteAdminReveal(id));
    const reorder = useAdminEventChange((next: number[]) =>
        reorderAdminReveals(event.id, next)
    );

    const submit = (e: FormEvent) => {
        e.preventDefault();
        add.mutate(undefined, {
            onSuccess: () => {
                setGame(null);
                setLabel("");
            },
            onError: () => notify("That reveal didn’t go in", "error"),
        });
    };

    return (
        <section className={cardClass("flex flex-col gap-4")}>
            <div>
                <h3 className="font-display text-section text-content">
                    Running order
                </h3>
                <p className="text-label-sm text-content-muted">
                    {showcase.reveals.length} reveals, in the order shown
                </p>
            </div>
            {showcase.reveals.length > 0 && (
                <ol className="flex flex-col divide-y divide-subtle">
                    {showcase.reveals.map((reveal, i) => (
                        <li
                            key={reveal.id}
                            className="flex items-center gap-3 py-2"
                        >
                            <GameCover
                                coverUrl={reveal.game?.coverUrl ?? null}
                                title=""
                                sizes="40px"
                                className="aspect-3/4 w-10 shrink-0 rounded-sm"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-body-sm font-medium text-content">
                                    {reveal.game?.title ?? reveal.label}
                                </p>
                                <p className="truncate text-label-sm text-content-muted">
                                    {REVEAL_TAG_LABELS[reveal.tag]} ·{" "}
                                    {reveal.hype} hyped
                                </p>
                            </div>
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
                                onClick={() => remove.mutate(reveal.id)}
                                className={ICON_BUTTON}
                            >
                                <Trash2 size={16} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ol>
            )}
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
                            exclude={showcase.reveals.flatMap((r) =>
                                r.game ? [r.game.id] : []
                            )}
                        />
                    )}
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                        label="Name"
                        help="For something shown before it has a page."
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
                    <Field label="What it was">
                        {(a11y) => (
                            <Dropdown
                                id={a11y.id}
                                options={TAG_OPTIONS}
                                value={tag}
                                onChange={(value) => setTag(value as RevealTag)}
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
                    Add reveal
                </Button>
            </form>
        </section>
    );
};

export default RevealsPanel;
