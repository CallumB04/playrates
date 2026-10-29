import { useId, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
    Flag,
    ImageIcon,
    ListPlus,
    Lock,
    Pencil,
    Pin,
    Trash2,
    Users,
} from "lucide-react";
import type { GameListDetail, GameListEntry } from "@playrates/shared";
import NotFoundPage from "../NotFoundPage";
import { ApiError } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useAddToList,
    useDeleteList,
    useList,
    useListVote,
    useSetListGames,
} from "../../hooks/queries/useLists";
import { usePlatforms } from "../../hooks/queries/useGames";
import { useMyGameLogIds } from "../../hooks/queries/useGameLogs";
import StatusBadge from "../../components/ui/StatusBadge";
import { displayStatusFor } from "../../constants/gameStatus";
import { usePageMeta } from "../../hooks/usePageMeta";
import Button, { buttonClass } from "../../components/ui/Button";
import ConfirmPopup from "../../components/ui/ConfirmPopup";
import LoveButton from "../../components/ui/LoveButton";
import EmptyPlate from "../../components/ui/EmptyPlate";
import { Skeleton } from "../../components/ui/Skeleton";
import { cardClass } from "../../components/ui/Card";
import CoverGrid from "../../components/game/CoverGrid";
import GameTile, { type TileAction } from "../../components/game/GameTile";
import { useTileActions } from "../../components/game/useTileActions";
import GamePicker from "../../components/community/GamePicker";
import ListEditor, {
    type ListEditorView,
} from "../../components/lists/ListEditor";
import ListVisibilitySelect from "../../components/lists/ListVisibilitySelect";
import RankedList from "../../components/ranked/RankedList";
import RankedGameRow from "../../components/ranked/RankedGameRow";
import ReportDialog from "../../components/ReportDialog";
import ShareList from "../../components/lists/ShareList";
import { usePins } from "../ProfilePage/lib/usePinReviews";
import { accentHue, avatarGradient } from "../../lib/profileAccent";
import { formatCount, formatDate, releaseYear } from "../../lib/format";
import { listPath, profilePath } from "../../lib/profilePaths";
import { cn } from "../../lib/cn";
import { whyCannotLove } from "../../lib/voting";

/** Why a list didn't come back: gone, or not this viewer's to see, which
 *  the API says the same way. */
const isMissing = (error: unknown) =>
    error instanceof ApiError && error.status === 404;

/** Pins the list to its owner's profile, or with no slot free, opens the
 *  shop at one. Only for a list everyone can see: a hidden one pinned
 *  would be an empty card to anyone else. */
const PinList = ({ listId }: { listId: number }) => {
    const pins = usePins("pinnedLists");
    const on = pins.pinned.includes(listId);
    return (
        <Button
            variant="ghost"
            size="sm"
            aria-pressed={on}
            onClick={() => pins.toggle(listId)}
            disabled={pins.saving}
            className="max-sm:min-h-11"
        >
            <Pin size={14} aria-hidden fill={on ? "currentColor" : "none"} />
            {on ? "Pinned" : "Pin to profile"}
        </Button>
    );
};

/** One list: what it is, whose it is, and its games. */
const ListPage = () => {
    const { username = "", listId: rawId = "" } = useParams();
    const listId = Number(rawId);
    const { data: list, isLoading, error } = useList(listId);

    usePageMeta({
        title: list ? `${list.name}, a list by ${list.owner.username}` : "List",
        description: list?.description || undefined,
        noindex: list ? list.visibility !== "everyone" : true,
    });

    if (!Number.isInteger(listId)) return <NotFoundPage />;
    // The API won't say whether a hidden list exists, so neither does this;
    // it says what it can, and leads to the owner's lists.
    if (isMissing(error))
        return (
            <EmptyPlate
                title="This list can't be shown"
                body="It may have been deleted, or its owner keeps it to themselves or their friends."
                action={
                    <Link
                        to={profilePath(username, "lists")}
                        className={buttonClass("primary")}
                    >
                        {username}’s lists
                    </Link>
                }
            />
        );
    if (isLoading || !list) return <ListSkeleton />;
    // The link may name its owner as they were: follow them to now.
    if (list.owner.username !== username) {
        return <Navigate to={listPath(list.owner.username, list.id)} replace />;
    }
    return <LoadedList list={list} />;
};

const LoadedList = ({ list }: { list: GameListDetail }) => {
    const { user } = useAuth();
    const { openSignup } = useAccountForm();
    const notify = useNotify();
    const navigate = useNavigate();
    const isOwner = user?.username === list.owner.username;
    // Which of the editor's views is open, from Edit or a press on the covers.
    const [editing, setEditing] = useState<ListEditorView | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [reporting, setReporting] = useState(false);
    const vote = useListVote(list.id);
    const remove = useDeleteList();

    const Hidden =
        list.visibility === "private"
            ? Lock
            : list.visibility === "friends"
              ? Users
              : null;
    const colour = list.colour ? avatarGradient(accentHue(list.colour)) : null;

    return (
        <div className="flex flex-col gap-6">
            <header
                className={cardClass("relative overflow-hidden", {
                    padding: "none",
                })}
            >
                {colour && (
                    // Its colour down the edge, as on its card.
                    <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1.5"
                        style={{ backgroundImage: colour }}
                    />
                )}
                <div className="relative flex gap-4 p-4 sm:gap-6 sm:p-6">
                    {isOwner ? (
                        <button
                            type="button"
                            onClick={() => setEditing("look")}
                            aria-label="Change the covers"
                            className="group/covers relative w-24 shrink-0 cursor-pointer self-start rounded-sm shadow-plate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-36"
                        >
                            <CoverGrid covers={list.covers} />
                            {/* Said over the covers as a pointer rests on them. A
                                phone has nothing to rest, so its mark stands. */}
                            <span
                                aria-hidden
                                className="absolute inset-0 hidden place-items-center rounded-sm bg-media-scrim-strong text-label font-medium text-content-on-media opacity-0 transition-opacity group-hover/covers:opacity-100 group-focus-visible/covers:opacity-100 sm:grid"
                            >
                                <span className="flex items-center gap-1.5">
                                    <ImageIcon size={14} />
                                    Change covers
                                </span>
                            </span>
                            <span
                                aria-hidden
                                className="absolute right-1 bottom-1 grid size-7 place-items-center rounded-full bg-media-scrim-strong text-content-on-media sm:hidden"
                            >
                                <Pencil size={13} />
                            </span>
                        </button>
                    ) : (
                        <CoverGrid
                            covers={list.covers}
                            className="w-24 shrink-0 self-start shadow-plate sm:w-36"
                        />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex flex-wrap items-center gap-2 text-label-sm text-content-muted">
                            <span>{list.ranked ? "Ranked list" : "List"}</span>
                            {isOwner ? (
                                <ListVisibilitySelect list={list} />
                            ) : (
                                Hidden && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2 py-0.5">
                                        <Hidden size={11} aria-hidden />
                                        Friends
                                    </span>
                                )
                            )}
                        </div>
                        <h1 className="mt-1 font-display text-[22px] leading-tight font-semibold break-words text-content sm:text-[30px]">
                            {list.name}
                        </h1>
                        <p className="mt-1.5 text-label text-content-muted">
                            by{" "}
                            <Link
                                to={profilePath(list.owner.username, "lists")}
                                className="font-medium text-content hover:text-brand"
                            >
                                {list.owner.username}
                            </Link>{" "}
                            · {formatCount(list.gameCount)}{" "}
                            {list.gameCount === 1 ? "game" : "games"} · updated{" "}
                            {formatDate(list.updatedAt)}
                        </p>
                        {list.description && (
                            <p className="mt-3 text-body-sm leading-relaxed whitespace-pre-line text-content-secondary max-sm:hidden">
                                {list.description}
                            </p>
                        )}
                    </div>
                </div>
                {list.description && (
                    <p className="relative -mt-1 px-4 pb-4 text-body-sm leading-relaxed whitespace-pre-line text-content-secondary sm:hidden">
                        {list.description}
                    </p>
                )}
                {/* A visitor has nothing to do here, so with nothing to
                    show either the strip would be empty. */}
                {(user || list.voteCount > 0) && (
                    <div className="relative flex flex-wrap items-center gap-2 border-t border-subtle px-4 py-3 sm:px-6">
                        <LoveButton
                            count={list.voteCount}
                            loved={list.votedByViewer}
                            disabledReason={whyCannotLove(
                                user?.username,
                                list.owner.username
                            )}
                            onJoin={user ? undefined : openSignup}
                            onToggle={() => vote.mutateAsync()}
                            className="max-sm:flex-1 max-sm:justify-center"
                        />
                        <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                            <ShareList
                                list={list}
                                viewerUsername={user?.username}
                            />
                            {isOwner ? (
                                <>
                                    {list.visibility === "everyone" && (
                                        <PinList listId={list.id} />
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditing("details")}
                                        className="max-sm:min-h-11"
                                    >
                                        <Pencil size={14} aria-hidden />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleting(true)}
                                        className="max-sm:min-h-11"
                                    >
                                        <Trash2 size={14} aria-hidden />
                                        Delete
                                    </Button>
                                </>
                            ) : (
                                user && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setReporting(true)}
                                        className="max-sm:min-h-11"
                                    >
                                        <Flag size={14} aria-hidden />
                                        Report
                                    </Button>
                                )
                            )}
                        </div>
                    </div>
                )}
            </header>

            {isOwner && <AddGames list={list} />}

            <ListGames list={list} isOwner={isOwner} />

            {editing !== null && (
                <ListEditor
                    list={list}
                    initialView={editing}
                    onClose={() => setEditing(null)}
                />
            )}
            {deleting && (
                <ConfirmPopup
                    title="Delete this list?"
                    body={`“${list.name}” and its place for each game go. The games stay where else you've logged them.`}
                    confirmLabel="Delete list"
                    tone="danger"
                    isPending={remove.isPending}
                    onClose={() => setDeleting(false)}
                    onConfirm={() =>
                        remove.mutate(list.id, {
                            onSuccess: () => {
                                notify("List deleted", "success");
                                navigate(
                                    profilePath(list.owner.username, "lists")
                                );
                            },
                            onError: () =>
                                notify("Couldn't delete the list", "error"),
                        })
                    }
                />
            )}
            {reporting && (
                <ReportDialog
                    targetType="list"
                    targetId={list.id}
                    onClose={() => setReporting(false)}
                />
            )}
        </div>
    );
};

/** A search that puts what you pick on the end of the list. Set apart and
 *  said in so many words: as a bare box above the games it read as a way
 *  to search the list. */
const AddGames = ({ list }: { list: GameListDetail }) => {
    const notify = useNotify();
    const add = useAddToList(list.id);
    const fieldId = useId();
    const inList = new Set(list.games.map((e) => e.game.id));
    // Your own games first: a list is usually of things you've played.
    const { data: myLogs } = useMyGameLogIds();
    const logOf = (gameId: number) =>
        myLogs?.find((log) => log.gameId === gameId);

    return (
        <section className="rounded-lg border border-dashed border-strong bg-surface-sunken/40 p-3 sm:p-4">
            <label
                htmlFor={fieldId}
                className="mb-2 flex items-center gap-2 text-body-sm font-medium text-content"
            >
                <ListPlus size={16} aria-hidden className="text-brand" />
                Add a game to this list
            </label>
            <GamePicker
                id={fieldId}
                value={null}
                placeholder="Search for a game to add"
                markFor={(id) => {
                    const log = logOf(id);
                    return log ? (
                        <StatusBadge
                            status={displayStatusFor(
                                log.status,
                                log.playedStatus
                            )}
                            size="stamp"
                            className="shrink-0"
                        />
                    ) : null;
                }}
                onChange={(game) => {
                    if (!game) return;
                    if (inList.has(game.id)) {
                        notify(`${game.title} is in the list already`, "info");
                        return;
                    }
                    add.mutate(game.id, {
                        onSuccess: () =>
                            notify(`Added ${game.title}`, "success"),
                        onError: (error) =>
                            notify(
                                error instanceof ApiError &&
                                    error.status === 422
                                    ? error.message
                                    : "Couldn't add that game",
                                "error"
                            ),
                    });
                }}
            />
        </section>
    );
};

/** Its games: numbered rows its owner can reorder when ranked, covers when
 *  not. Either way its owner can take one out. */
const ListGames = ({
    list,
    isOwner,
}: {
    list: GameListDetail;
    isOwner: boolean;
}) => {
    const notify = useNotify();
    const setGames = useSetListGames(list.id);
    const { data: platforms } = usePlatforms();
    const { actionsFor, statusFor } = useTileActions();
    const order = list.games.map((e) => e.game.id);

    const removeGame = (gameId: number) =>
        setGames.mutate(
            order.filter((id) => id !== gameId),
            { onError: () => notify("Couldn't take that game out", "error") }
        );
    const removeAction = (entry: GameListEntry): TileAction => ({
        key: "remove",
        label: "Remove from list",
        tone: "danger",
        onSelect: () => removeGame(entry.game.id),
    });

    if (list.games.length === 0) {
        return (
            <EmptyPlate
                title="No games yet"
                body={
                    isOwner
                        ? "Search for a game above, or use Add to list on any game."
                        : undefined
                }
            />
        );
    }

    if (!list.ranked) {
        return (
            <ul className="grid grid-cols-2 gap-x-3.5 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {list.games.map((entry) => (
                    <li key={entry.game.id}>
                        <GameTile
                            gameId={entry.game.id}
                            title={entry.game.title}
                            coverUrl={entry.game.coverUrl}
                            platformSlugs={entry.game.platforms}
                            platforms={platforms ?? []}
                            footValue={releaseYear(entry.game.releaseDate)}
                            status={statusFor(entry.game)}
                            actions={[
                                ...actionsFor(entry.game),
                                ...(isOwner ? [removeAction(entry)] : []),
                            ]}
                        />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div className={cardClass("p-1.5 sm:p-2", { padding: "none" })}>
            <RankedList
                items={list.games}
                idOf={(entry) => entry.game.id}
                rankOf={(entry) => entry.rank}
                titleOf={(entry) => entry.game.title}
                coverOf={(entry) => entry.game.coverUrl}
                total={list.games.length}
                canReorder={isOwner}
                onReorder={(next) =>
                    setGames.mutateAsync(next).catch((err: unknown) => {
                        notify("Couldn't save the order", "error");
                        throw err;
                    })
                }
                describe={(rank, total) =>
                    `#${rank} of ${formatCount(total)} in ${list.name}`
                }
                renderRow={(entry, row) => (
                    <RankedGameRow
                        ref={row.ref}
                        style={row.style}
                        gameId={entry.game.id}
                        title={entry.game.title}
                        coverUrl={entry.game.coverUrl}
                        releaseDate={entry.game.releaseDate}
                        rank={row.rank}
                        handle={row.handle}
                        lifted={row.lifted}
                        ghost={row.ghost}
                        actions={actionsFor(entry.game).filter((a) => !a.icon)}
                        onMore={row.onMore}
                        moreOnPhoneOnly={!isOwner}
                    />
                )}
                sheetActions={(entry, close) => (
                    <div
                        className={cn(
                            "mt-4 flex flex-col gap-2 border-t border-subtle pt-4",
                            // A visitor's row carries these itself from sm up.
                            !isOwner && "sm:hidden"
                        )}
                    >
                        {actionsFor(entry.game)
                            .filter((a) => !a.icon)
                            .map((action) => (
                                <Button
                                    key={action.key}
                                    size="touch"
                                    variant="secondary"
                                    className="sm:hidden"
                                    onClick={() => {
                                        void action.onSelect();
                                        close();
                                    }}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        {isOwner && (
                            <Button
                                size="touch"
                                variant="ghost"
                                className="sm:min-h-10"
                                onClick={() => {
                                    removeGame(entry.game.id);
                                    close();
                                }}
                            >
                                <Trash2 size={15} aria-hidden />
                                Remove from list
                            </Button>
                        )}
                    </div>
                )}
            />
        </div>
    );
};

const ListSkeleton = () => (
    <div className="flex flex-col gap-6">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
    </div>
);

export default ListPage;
