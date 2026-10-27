import { useMemo, useState, type FormEvent } from "react";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type Announcements,
    type DragEndEvent,
    type UniqueIdentifier,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    restrictToParentElement,
    restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
    ArrowDown,
    ArrowDownToLine,
    ArrowUp,
    ArrowUpToLine,
} from "lucide-react";
import type { WishlistEntry } from "@playrates/shared";
import type { TileAction } from "../../../components/game/GameTile";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import { NumberInput } from "../../../components/ui/Input";
import GameCover from "../../../components/game/GameCover";
import { ApiError } from "../../../api";
import { useNotify } from "../../../contexts/NotificationContext";
import { usePlatformSystems } from "../../../hooks/queries/useGames";
import { useReorderWishlist } from "../../../hooks/queries/useWishlist";
import { formatCount } from "../../../lib/format";
import {
    moveAmong,
    moveTo,
    sortWishlist,
    type WishlistSort,
} from "../lib/wishlist";
import WishlistRow, { type WishlistRowProps } from "./WishlistRow";

interface WishlistListProps {
    /** The whole wishlist, in its owner's order. */
    wishlist: WishlistEntry[];
    /** Narrows the list to games wished for on this console. */
    console?: string;
    sort: WishlistSort;
    isMyAccount: boolean;
    buildTileActions: (entry: WishlistEntry) => TileAction[];
}

const SortableRow = (props: WishlistRowProps) => {
    const {
        setNodeRef,
        setActivatorNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.entry.gameId });

    return (
        <WishlistRow
            {...props}
            ref={setNodeRef}
            ghost={isDragging}
            style={{
                transform: CSS.Translate.toString(transform),
                transition,
            }}
            handle={{ ...attributes, ...listeners, ref: setActivatorNodeRef }}
        />
    );
};

/** The order a save failing with this should be told: a stale tab is worth
 *  explaining, anything else is just a failure. */
const saveFailure = (error: unknown) =>
    error instanceof ApiError && error.status === 422
        ? error.message
        : "Couldn't save your wishlist order";

/**
 * The wishlist as a ranked list. Its owner can drag a row by its handle, by
 * mouse, touch or keyboard, or move it from the ⋯ sheet, which also takes a
 * place by number, as on Steam. Each move saves at once.
 */
const WishlistList = ({
    wishlist,
    console: consoleSlug,
    sort,
    isMyAccount,
    buildTileActions,
}: WishlistListProps) => {
    const notify = useNotify();
    const reorder = useReorderWishlist();
    const { data: systemList } = usePlatformSystems();
    const systems = useMemo(
        () => new Map((systemList ?? []).map((s) => [s.slug, s])),
        [systemList]
    );

    /* The order a drop asked for, held until the cache catches up: dnd-kit
       lets go of the row on drop, and for a frame before the optimistic
       update lands it would jump back. Tied to the list it was made from,
       so new data from anywhere replaces it. */
    const [held, setHeld] = useState<{
        from: WishlistEntry[];
        order: number[];
    } | null>(null);
    const order = useMemo(
        () =>
            held?.from === wishlist
                ? held.order
                : wishlist.map((e) => e.gameId),
        [held, wishlist]
    );

    const shown = useMemo(() => {
        const byId = new Map(wishlist.map((e) => [e.gameId, e]));
        const ranked = order.flatMap((id, i) => {
            const entry = byId.get(id);
            return entry ? [{ ...entry, rank: i + 1 }] : [];
        });
        const narrowed = consoleSlug
            ? ranked.filter((e) => e.consoles.includes(consoleSlug))
            : ranked;
        return sortWishlist(narrowed, sort);
    }, [wishlist, order, consoleSlug, sort]);
    const shownIds = shown.map((e) => e.gameId);

    const canReorder = isMyAccount && sort === "rank";
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
    const [sheetFor, setSheetFor] = useState<WishlistEntry | null>(null);
    const [said, setSaid] = useState("");

    /* Mid-drag, each row shows the place it would have if dropped now.
       Filtered, the places are the ones the shown games hold between them. */
    const slots = shown.map((e) => e.rank);
    const preview =
        activeId !== null && overId !== null
            ? arrayMove(
                  shownIds,
                  shownIds.indexOf(Number(activeId)),
                  shownIds.indexOf(Number(overId))
              )
            : shownIds;
    const rankNow = (gameId: number) => slots[preview.indexOf(gameId)] ?? 0;

    const titleOf = (id: UniqueIdentifier) =>
        shown.find((e) => e.gameId === Number(id))?.game?.title ?? "Game";

    /* A drag is announced by dnd-kit; a move from the sheet has only this
       to say it happened. */
    const save = (next: number[], gameId: number, announce = true) => {
        if (next === order) return;
        setHeld({ from: wishlist, order: next });
        if (announce) {
            setSaid(`${titleOf(gameId)} moved to #${next.indexOf(gameId) + 1}`);
        }
        reorder.mutate(next, {
            onError: (error) => {
                setHeld(null);
                notify(saveFailure(error), "error");
            },
        });
    };

    const sensors = useSensors(
        // The handle is touch-action: none, so a finger drags it at once.
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setActiveId(null);
        setOverId(null);
        if (!over || active.id === over.id) return;
        const id = Number(active.id);
        const after = arrayMove(
            shownIds,
            shownIds.indexOf(id),
            shownIds.indexOf(Number(over.id))
        );
        save(moveAmong(order, id, after), id, false);
    };

    const announcements: Announcements = {
        onDragStart: ({ active }) =>
            `Picked up ${titleOf(active.id)}, at #${rankNow(Number(active.id))}.`,
        onDragOver: ({ active, over }) =>
            over
                ? `${titleOf(active.id)} is at #${slots[shownIds.indexOf(Number(over.id))]}.`
                : undefined,
        onDragEnd: ({ active, over }) =>
            over
                ? `${titleOf(active.id)} moved to #${slots[shownIds.indexOf(Number(over.id))]}.`
                : undefined,
        onDragCancel: ({ active }) =>
            `${titleOf(active.id)} put back at #${rankNow(Number(active.id))}.`,
    };

    const active = shown.find((e) => e.gameId === Number(activeId));

    const rows = shown.map((entry) => {
        const props = {
            entry,
            rank: canReorder ? rankNow(entry.gameId) : entry.rank,
            systems,
            actions: buildTileActions(entry),
            onMore: () => setSheetFor(entry),
            // A visitor's sheet only holds what the row shows from sm up.
            moreOnPhoneOnly: !isMyAccount,
        };
        return canReorder ? (
            <SortableRow key={entry.gameId} {...props} />
        ) : (
            <WishlistRow key={entry.gameId} {...props} />
        );
    });

    return (
        <>
            {isMyAccount && sort !== "rank" && (
                <p className="mb-2 px-2 text-label text-content-muted">
                    Sort by your order to rearrange.
                </p>
            )}

            {canReorder ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[
                        restrictToVerticalAxis,
                        restrictToParentElement,
                    ]}
                    accessibility={{ announcements }}
                    onDragStart={({ active }) => setActiveId(active.id)}
                    onDragOver={({ over }) => setOverId(over?.id ?? null)}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => {
                        setActiveId(null);
                        setOverId(null);
                    }}
                >
                    <SortableContext
                        items={shownIds}
                        strategy={verticalListSortingStrategy}
                    >
                        <ol className="flex flex-col gap-0.5">{rows}</ol>
                    </SortableContext>
                    <DragOverlay>
                        {active && (
                            <ol>
                                <WishlistRow
                                    entry={active}
                                    rank={rankNow(active.gameId)}
                                    systems={systems}
                                    actions={buildTileActions(active)}
                                    handle={{}}
                                    onMore={() => undefined}
                                    lifted
                                />
                            </ol>
                        )}
                    </DragOverlay>
                </DndContext>
            ) : (
                <ol className="flex flex-col gap-0.5">{rows}</ol>
            )}

            <p aria-live="polite" className="sr-only">
                {said}
            </p>

            {sheetFor && (
                <RowSheet
                    entry={
                        shown.find((e) => e.gameId === sheetFor.gameId) ??
                        sheetFor
                    }
                    total={order.length}
                    canReorder={canReorder}
                    isMyAccount={isMyAccount}
                    actions={buildTileActions(sheetFor)}
                    onMove={(place) =>
                        save(
                            moveTo(order, sheetFor.gameId, place),
                            sheetFor.gameId
                        )
                    }
                    onStep={(by) => {
                        const at = shownIds.indexOf(sheetFor.gameId);
                        const to = at + by;
                        if (to < 0 || to >= shownIds.length) return;
                        save(
                            moveAmong(
                                order,
                                sheetFor.gameId,
                                arrayMove(shownIds, at, to)
                            ),
                            sheetFor.gameId
                        );
                    }}
                    isFirstShown={shownIds[0] === sheetFor.gameId}
                    isLastShown={shownIds.at(-1) === sheetFor.gameId}
                    onClose={() => setSheetFor(null)}
                />
            )}
        </>
    );
};

interface RowSheetProps {
    entry: WishlistEntry;
    total: number;
    canReorder: boolean;
    isMyAccount: boolean;
    actions: TileAction[];
    /** To a place in the whole list, counted from 1. */
    onMove: (place: number) => void;
    /** Past the neighbour shown above or below it. */
    onStep: (by: -1 | 1) => void;
    isFirstShown: boolean;
    isLastShown: boolean;
    onClose: () => void;
}

/** The ⋯ sheet: the moves, and the log actions a phone has no room for. */
const RowSheet = ({
    entry,
    total,
    canReorder,
    isMyAccount,
    actions,
    onMove,
    onStep,
    isFirstShown,
    isLastShown,
    onClose,
}: RowSheetProps) => {
    const [place, setPlace] = useState(String(entry.rank));
    const title = entry.game?.title ?? "Unknown game";
    const target = Number(place);
    const valid =
        Number.isInteger(target) &&
        target >= 1 &&
        target <= total &&
        target !== entry.rank;

    const act = (run: () => void) => () => {
        run();
        onClose();
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (valid) act(() => onMove(target))();
    };

    return (
        <Modal
            onClose={onClose}
            labelledBy="wishlist-sheet-title"
            className="sm:w-md"
        >
            <div className="flex items-center gap-3 pr-10">
                <GameCover
                    coverUrl={entry.game?.coverUrl ?? null}
                    title={title}
                    className="aspect-3/4 w-10 shrink-0 rounded-xs"
                />
                <div className="min-w-0">
                    <h2
                        id="wishlist-sheet-title"
                        className="truncate font-display text-base font-semibold text-content"
                    >
                        {title}
                    </h2>
                    <p className="text-label text-content-muted">
                        #{entry.rank} of {formatCount(total)} on{" "}
                        {isMyAccount ? "your" : "their"} wishlist
                    </p>
                </div>
            </div>

            {canReorder && (
                <>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                            variant="secondary"
                            size="touch"
                            className="sm:min-h-10"
                            disabled={entry.rank === 1}
                            onClick={act(() => onMove(1))}
                        >
                            <ArrowUpToLine size={16} aria-hidden />
                            To the top
                        </Button>
                        <Button
                            variant="secondary"
                            size="touch"
                            className="sm:min-h-10"
                            disabled={entry.rank === total}
                            onClick={act(() => onMove(total))}
                        >
                            <ArrowDownToLine size={16} aria-hidden />
                            To the bottom
                        </Button>
                        <Button
                            variant="secondary"
                            size="touch"
                            className="sm:min-h-10"
                            disabled={isFirstShown}
                            onClick={act(() => onStep(-1))}
                        >
                            <ArrowUp size={16} aria-hidden />
                            Up one
                        </Button>
                        <Button
                            variant="secondary"
                            size="touch"
                            className="sm:min-h-10"
                            disabled={isLastShown}
                            onClick={act(() => onStep(1))}
                        >
                            <ArrowDown size={16} aria-hidden />
                            Down one
                        </Button>
                    </div>

                    <form
                        onSubmit={submit}
                        className="mt-3 flex items-end gap-2"
                    >
                        <label className="min-w-0 flex-1">
                            <span className="mb-1 block text-label text-content-secondary">
                                Move to place
                            </span>
                            <NumberInput
                                min={1}
                                max={total}
                                step={1}
                                inputMode="numeric"
                                value={place}
                                onChange={(e) => setPlace(e.target.value)}
                                onFocus={(e) => e.target.select()}
                            />
                        </label>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={!valid}
                        >
                            Move
                        </Button>
                    </form>
                </>
            )}

            {isMyAccount && !canReorder && (
                <p className="mt-4 text-body-sm text-content-muted">
                    Sort by your order to rearrange.
                </p>
            )}

            {/* From sm up the row carries these itself. */}
            {actions.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 border-t border-subtle pt-4 sm:hidden">
                    {actions
                        .filter((a) => !a.icon)
                        .map((action) => (
                            <Button
                                key={action.key}
                                size="touch"
                                variant={
                                    action.tone === "primary"
                                        ? "primary"
                                        : "secondary"
                                }
                                onClick={act(() => void action.onSelect())}
                            >
                                {action.label}
                            </Button>
                        ))}
                </div>
            )}
        </Modal>
    );
};

export default WishlistList;
