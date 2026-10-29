import {
    useId,
    useMemo,
    useState,
    type CSSProperties,
    type FormEvent,
    type ReactElement,
    type ReactNode,
} from "react";
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
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { NumberInput } from "../ui/Input";
import GameCover from "../game/GameCover";
import { moveTo } from "../../pages/ProfilePage/lib/wishlist";
import type { RankedRowHandle } from "./RankedGameRow";

/** What a row is handed to draw itself with. */
export interface RankedRowState {
    rank: number;
    onMore: () => void;
    handle?: RankedRowHandle;
    lifted?: boolean;
    ghost?: boolean;
    ref?: (node: HTMLLIElement | null) => void;
    style?: CSSProperties;
}

interface RankedListProps<T> {
    /** In the order to show them. When they can be reordered, all of them. */
    items: T[];
    idOf: (item: T) => number;
    /** Its place when it isn't being moved. */
    rankOf: (item: T) => number;
    titleOf: (item: T) => string;
    coverOf: (item: T) => string | null;
    /** How many places there are, for the sheet and "Move to place". */
    total: number;
    canReorder: boolean;
    /** Saves every item's new order. The list holds it on screen until the
     *  items change, and lets go of it if this rejects. */
    onReorder: (order: number[]) => Promise<unknown>;
    renderRow: (item: T, row: RankedRowState) => ReactElement;
    /** Under the sheet's title: "#3 of 18 on your wishlist". */
    describe: (rank: number, total: number) => string;
    /** The sheet's other actions, after the moves. */
    sheetActions?: (item: T, close: () => void) => ReactNode;
    /** Why it can't be reordered right now, to its owner. */
    hint?: string;
}

/**
 * A list someone puts in order: a wishlist, a ranked list. Its owner drags
 * a row by its handle, by mouse, touch or keyboard, or moves it from the ⋯
 * sheet, which also takes a place by number, as on Steam. Each move is
 * shown at once and saved.
 */
const RankedList = <T,>({
    items,
    idOf,
    rankOf,
    titleOf,
    coverOf,
    total,
    canReorder,
    onReorder,
    renderRow,
    describe,
    sheetActions,
    hint,
}: RankedListProps<T>) => {
    /* The order a drop asked for, held until the items catch up: dnd-kit
       lets go of the row on drop, and for a frame before the save's own
       update lands it would jump back. Tied to the items it was made from,
       so new data from anywhere replaces it. */
    const [held, setHeld] = useState<{ from: T[]; order: number[] } | null>(
        null
    );
    const shown = useMemo(() => {
        if (held?.from !== items) return items;
        const byId = new Map(items.map((item) => [idOf(item), item]));
        return held.order.flatMap((id) => byId.get(id) ?? []);
    }, [held, items, idOf]);
    const shownIds = shown.map(idOf);

    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
    const [sheetFor, setSheetFor] = useState<number | null>(null);
    const [said, setSaid] = useState("");

    // Mid-drag, each row shows the place it would have if dropped now.
    const preview =
        activeId !== null && overId !== null
            ? arrayMove(
                  shownIds,
                  shownIds.indexOf(Number(activeId)),
                  shownIds.indexOf(Number(overId))
              )
            : shownIds;
    const rankNow = (item: T) =>
        canReorder ? preview.indexOf(idOf(item)) + 1 : rankOf(item);
    const placeOf = (id: UniqueIdentifier) => shownIds.indexOf(Number(id)) + 1;
    const itemOf = (id: UniqueIdentifier) =>
        shown.find((item) => idOf(item) === Number(id));
    const titleOfId = (id: UniqueIdentifier) => {
        const item = itemOf(id);
        return item ? titleOf(item) : "Game";
    };

    /* A drag is announced by dnd-kit; a move from the sheet has only this
       to say it happened. */
    const save = (next: number[], id: number, announce = true) => {
        if (next === shownIds) return;
        setHeld({ from: items, order: next });
        if (announce) {
            setSaid(`${titleOfId(id)} moved to #${next.indexOf(id) + 1}`);
        }
        onReorder(next).catch(() => setHeld(null));
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
        save(moveTo(shownIds, id, placeOf(over.id)), id, false);
    };

    const announcements: Announcements = {
        onDragStart: ({ active }) => {
            const item = itemOf(active.id);
            return `Picked up ${titleOfId(active.id)}, at #${item ? rankNow(item) : 0}.`;
        },
        onDragOver: ({ active, over }) =>
            over
                ? `${titleOfId(active.id)} is at #${placeOf(over.id)}.`
                : undefined,
        onDragEnd: ({ active, over }) =>
            over
                ? `${titleOfId(active.id)} moved to #${placeOf(over.id)}.`
                : undefined,
        onDragCancel: ({ active }) => {
            const item = itemOf(active.id);
            return `${titleOfId(active.id)} put back at #${item ? rankNow(item) : 0}.`;
        },
    };

    const active = activeId === null ? undefined : itemOf(activeId);
    const sheetItem = sheetFor === null ? undefined : itemOf(sheetFor);

    const rows = shown.map((item) => {
        const state = {
            rank: rankNow(item),
            onMore: () => setSheetFor(idOf(item)),
        };
        return canReorder ? (
            <SortableRow
                key={idOf(item)}
                id={idOf(item)}
                render={(sortable) =>
                    renderRow(item, { ...state, ...sortable })
                }
            />
        ) : (
            <RowKey key={idOf(item)}>{renderRow(item, state)}</RowKey>
        );
    });

    return (
        <>
            {hint && (
                <p className="mb-2 px-2 text-label text-content-muted">
                    {hint}
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
                                {renderRow(active, {
                                    rank: rankNow(active),
                                    onMore: () => undefined,
                                    handle: {},
                                    lifted: true,
                                })}
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

            {sheetItem && (
                <RowSheet
                    title={titleOf(sheetItem)}
                    coverUrl={coverOf(sheetItem)}
                    rank={rankNow(sheetItem)}
                    total={total}
                    describe={describe}
                    canReorder={canReorder}
                    hint={hint}
                    onMove={(place) =>
                        save(
                            moveTo(shownIds, idOf(sheetItem), place),
                            idOf(sheetItem)
                        )
                    }
                    onClose={() => setSheetFor(null)}
                >
                    {sheetActions?.(sheetItem, () => setSheetFor(null))}
                </RowSheet>
            )}
        </>
    );
};

/** A row's place in the drag: its ref, its handle and where it's carried. */
const SortableRow = ({
    id,
    render,
}: {
    id: number;
    render: (state: Partial<RankedRowState>) => ReactElement;
}) => {
    const {
        setNodeRef,
        setActivatorNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    return render({
        ref: setNodeRef,
        ghost: isDragging,
        style: { transform: CSS.Translate.toString(transform), transition },
        handle: { ...attributes, ...listeners, ref: setActivatorNodeRef },
    });
};

// Somewhere to hang a key on a rendered row.
const RowKey = ({ children }: { children: ReactElement }) => children;

interface RowSheetProps {
    title: string;
    coverUrl: string | null;
    rank: number;
    total: number;
    describe: (rank: number, total: number) => string;
    canReorder: boolean;
    hint?: string;
    /** To a place in the whole list, counted from 1. */
    onMove: (place: number) => void;
    onClose: () => void;
    children?: ReactNode;
}

/** The ⋯ sheet: the moves, then whatever else the list offers. */
const RowSheet = ({
    title,
    coverUrl,
    rank,
    total,
    describe,
    canReorder,
    hint,
    onMove,
    onClose,
    children,
}: RowSheetProps) => {
    const titleId = useId();
    const [place, setPlace] = useState(String(rank));
    const target = Number(place);
    const valid =
        Number.isInteger(target) &&
        target >= 1 &&
        target <= total &&
        target !== rank;

    const act = (run: () => void) => () => {
        run();
        onClose();
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (valid) act(() => onMove(target))();
    };

    return (
        <Modal onClose={onClose} labelledBy={titleId} className="sm:w-md">
            <div className="flex items-center gap-3 pr-10">
                <GameCover
                    coverUrl={coverUrl}
                    title={title}
                    className="aspect-3/4 w-10 shrink-0 rounded-xs"
                />
                <div className="min-w-0">
                    <h2
                        id={titleId}
                        className="truncate font-display text-base font-semibold text-content"
                    >
                        {title}
                    </h2>
                    <p className="text-label text-content-muted">
                        {describe(rank, total)}
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
                            disabled={rank === 1}
                            onClick={act(() => onMove(1))}
                        >
                            <ArrowUpToLine size={16} aria-hidden />
                            To the top
                        </Button>
                        <Button
                            variant="secondary"
                            size="touch"
                            className="sm:min-h-10"
                            disabled={rank === total}
                            onClick={act(() => onMove(total))}
                        >
                            <ArrowDownToLine size={16} aria-hidden />
                            To the bottom
                        </Button>
                        <Button
                            variant="secondary"
                            size="touch"
                            className="sm:min-h-10"
                            disabled={rank === 1}
                            onClick={act(() => onMove(rank - 1))}
                        >
                            <ArrowUp size={16} aria-hidden />
                            Up one
                        </Button>
                        <Button
                            variant="secondary"
                            size="touch"
                            className="sm:min-h-10"
                            disabled={rank === total}
                            onClick={act(() => onMove(rank + 1))}
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

            {hint && (
                <p className="mt-4 text-body-sm text-content-muted">{hint}</p>
            )}

            {children}
        </Modal>
    );
};

export default RankedList;
