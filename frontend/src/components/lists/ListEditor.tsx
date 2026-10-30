import { useId, useState } from "react";
import { Check } from "lucide-react";
import {
    LIST_DESCRIPTION_MAX,
    LIST_NAME_MAX,
    MAX_LIST_COVERS,
    type GameListDetail,
    type ProfileAccent,
    type ProfileVisibility,
    type UpdateListInput,
} from "@playrates/shared";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { Input, Textarea } from "../ui/Input";
import SegmentedChoice from "../ui/SegmentedChoice";
import Toggle from "../ui/Toggle";
import AccentPicker from "../ui/AccentPicker";
import GameCover from "../game/GameCover";
import CoverGrid from "../game/CoverGrid";
import { ApiError } from "../../api";
import { useNotify } from "../../contexts/NotificationContext";
import { useCreateList, useUpdateList } from "../../hooks/queries/useLists";
import { PRIVACY_OPTIONS } from "../../pages/ProfilePage/components/PrivacySelect";
import { cn } from "../../lib/cn";
import { coversFor } from "../../lib/lists";

export type ListEditorView = "details" | "look";
type View = ListEditorView;

interface ListEditorProps {
    /** The list to edit; none to make a new one. */
    list?: GameListDetail;
    /** Games to start a new list with: Add to list's "New list" passes one. */
    startWith?: number[];
    /** The view to open on: the covers, from a press on them. */
    initialView?: View;
    onClose: () => void;
    onSaved?: (list: GameListDetail) => void;
}

/**
 * Making or changing a list, in two views so neither scrolls: what it is,
 * then how it looks. Covers are picked from its own games, so a new list
 * leaves them for later.
 */
const ListEditor = ({
    list,
    startWith,
    initialView = "details",
    onClose,
    onSaved,
}: ListEditorProps) => {
    const notify = useNotify();
    const ids = useId();
    const titleId = `${ids}-title`;
    const panelId = (of: View) => `${ids}-${of}`;
    const create = useCreateList();
    const update = useUpdateList(list?.id ?? 0);
    const saving = create.isPending || update.isPending;

    const [view, setView] = useState<View>(initialView);
    const [name, setName] = useState(list?.name ?? "");
    const [description, setDescription] = useState(list?.description ?? "");
    const [visibility, setVisibility] = useState<ProfileVisibility>(
        list?.visibility ?? "everyone"
    );
    const [ranked, setRanked] = useState(list?.ranked ?? false);
    const [colour, setColour] = useState<ProfileAccent | null>(
        list?.colour ?? null
    );
    const games = list?.games ?? [];
    const firstFour = coversFor([], games).map((c) => c.id);
    /* What its picture shows now, ticked: the picks and the first games
       that fill in around them, so the default four read as chosen too. */
    const [covers, setCovers] = useState<number[]>(() =>
        coversFor(list?.coverGameIds ?? [], games).map((c) => c.id)
    );
    const isFirstFour = covers.join() === firstFour.join();
    const nameMissing = name.trim().length === 0;

    const toggleCover = (gameId: number) =>
        setCovers((picked) =>
            picked.includes(gameId)
                ? picked.filter((id) => id !== gameId)
                : picked.length < MAX_LIST_COVERS
                  ? [...picked, gameId]
                  : picked
        );

    const save = async () => {
        if (nameMissing) {
            setView("details");
            return;
        }
        const fields = {
            name: name.trim(),
            description: description.trim(),
            visibility,
            ranked,
            colour,
        };
        const changes = (from: GameListDetail): UpdateListInput => {
            const shown = coversFor(from.coverGameIds ?? [], from.games);
            if (covers.join() === shown.map((c) => c.id).join()) return fields;
            // The first four are the default, not a pick to hold on to.
            return {
                ...fields,
                coverGameIds:
                    isFirstFour || covers.length === 0 ? null : covers,
            };
        };
        try {
            /* Awaited before onSaved: `onSaved?.(await …)` skips its own
               argument when there's no onSaved, and the save with it. */
            const saved = list
                ? await update.mutateAsync(changes(list))
                : await create.mutateAsync({ ...fields, gameIds: startWith });
            onSaved?.(saved);
            onClose();
        } catch (error) {
            notify(
                error instanceof ApiError &&
                    error.status !== undefined &&
                    error.status < 500
                    ? error.message
                    : "Couldn't save the list",
                "error"
            );
        }
    };

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-[520px]"
        >
            <h2
                id={titleId}
                className="border-b border-subtle pb-3 font-display text-section text-content"
            >
                {list ? "Edit list" : "New list"}
            </h2>

            <SegmentedChoice
                label="List editor views"
                segments={[
                    {
                        value: "details",
                        label: "Details",
                        flagged: nameMissing && view === "look",
                    },
                    { value: "look", label: "Covers & colour" },
                ]}
                value={view}
                onChange={setView}
                panelId={panelId}
                fill
                className="mt-3"
            />

            {/* Stacked in one cell, so the popup holds the height of the
                taller view and doesn't jump between them. */}
            <div className="mt-4 grid">
                <div
                    id={panelId("details")}
                    role="tabpanel"
                    aria-labelledby={`${panelId("details")}-tab`}
                    className={cn(
                        "col-start-1 row-start-1 flex flex-col gap-4",
                        view !== "details" && "invisible"
                    )}
                >
                    <Field label="Name">
                        {(a11y) => (
                            <Input
                                {...a11y}
                                value={name}
                                maxLength={LIST_NAME_MAX}
                                placeholder="Best RPGs"
                                onChange={(e) => setName(e.target.value)}
                            />
                        )}
                    </Field>
                    <Field
                        label="Description"
                        help={`${description.length} of ${LIST_DESCRIPTION_MAX} characters`}
                    >
                        {(a11y) => (
                            <Textarea
                                {...a11y}
                                rows={3}
                                value={description}
                                maxLength={LIST_DESCRIPTION_MAX}
                                placeholder="Add a description (optional)"
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        )}
                    </Field>
                    <div>
                        <p className="mb-2 text-label-sm text-content-muted">
                            Who can see it
                        </p>
                        <SegmentedChoice
                            label="Who can see it"
                            segments={PRIVACY_OPTIONS.map(
                                ({ value, label, icon }) => ({
                                    value,
                                    label,
                                    icon,
                                })
                            )}
                            value={visibility}
                            onChange={setVisibility}
                            fill
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-body-sm font-medium text-content">
                                Ranked list
                            </p>
                            <p className="text-label-sm text-content-muted">
                                Numbers the games, in your order.
                            </p>
                        </div>
                        <Toggle
                            checked={ranked}
                            onChange={setRanked}
                            label="Ranked list"
                            labelPosition="hidden"
                        />
                    </div>
                </div>

                <div
                    id={panelId("look")}
                    role="tabpanel"
                    aria-labelledby={`${panelId("look")}-tab`}
                    className={cn(
                        "col-start-1 row-start-1 flex flex-col gap-4",
                        view !== "look" && "invisible"
                    )}
                >
                    <div>
                        <p className="mb-2 text-label-sm text-content-muted">
                            Colour
                        </p>
                        <AccentPicker
                            allowNone
                            label="List colour"
                            value={colour}
                            onChange={setColour}
                        />
                    </div>
                    <div>
                        <p className="mb-2 text-label-sm text-content-muted">
                            Covers
                        </p>
                        {games.length === 0 ? (
                            <p className="text-body-sm text-content-muted">
                                Add some games first, then pick the covers here.
                            </p>
                        ) : (
                            <>
                                <div className="flex items-start gap-3">
                                    <CoverGrid
                                        covers={coversFor(covers, games)}
                                        className="w-20 shrink-0 shadow-plate sm:w-24"
                                    />
                                    <div className="min-w-0 pt-0.5">
                                        <p className="text-body-sm text-content">
                                            {covers.length} of {MAX_LIST_COVERS}{" "}
                                            picked.
                                        </p>
                                        <p className="mt-1 text-label-sm text-content-muted">
                                            Pick up to four, in order. The rest
                                            come from the first games added.
                                        </p>
                                        {!isFirstFour && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCovers(firstFour)
                                                }
                                                className="relative mt-2 cursor-pointer text-label-sm text-content underline before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:text-brand"
                                            >
                                                Use the first four
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <ul
                                    aria-label="Pick up to four covers"
                                    className="mt-3 grid max-h-44 grid-cols-5 content-start gap-2 overflow-y-auto p-1 sm:grid-cols-7"
                                >
                                    {games.map(({ game }) => {
                                        const at = covers.indexOf(game.id);
                                        const full =
                                            covers.length >= MAX_LIST_COVERS;
                                        return (
                                            <li key={game.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={at >= 0}
                                                    aria-label={game.title}
                                                    disabled={at < 0 && full}
                                                    onClick={() =>
                                                        toggleCover(game.id)
                                                    }
                                                    className={cn(
                                                        "relative block w-full cursor-pointer overflow-hidden rounded-xs transition-opacity",
                                                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                                        at >= 0
                                                            ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-raised"
                                                            : // The picked ones stand out; the rest wait.
                                                              "opacity-60 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                                                    )}
                                                >
                                                    <GameCover
                                                        coverUrl={game.coverUrl}
                                                        title=""
                                                        className="aspect-3/4 w-full"
                                                    />
                                                    {at >= 0 && (
                                                        <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-brand text-label-sm font-semibold text-content-on-solid shadow-plate">
                                                            <span className="cap-box">
                                                                {at + 1}
                                                            </span>
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:justify-end">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => void save()}
                    disabled={saving || nameMissing}
                    className="w-full sm:w-auto"
                >
                    <Check size={15} aria-hidden />
                    {saving ? "Saving…" : list ? "Save" : "Create list"}
                </Button>
            </div>
        </Modal>
    );
};

export default ListEditor;
