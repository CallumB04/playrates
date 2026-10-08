import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Flag, Pencil, Settings } from "lucide-react";
import ReportDialog from "../../components/ReportDialog";
import type { ShelfEntry } from "@playrates/shared";
import { useLogFlow } from "../../components/gamelog/useLogFlow";
import {
    GAME_LOG_SORTS,
    PLAYED_STATUSES,
    type GameLogSort,
    type PlayedStatusFilter,
    type SortDirection,
} from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useProfile } from "../../hooks/queries/useProfiles";
import {
    useMyGameLogIds,
    useUserShelf,
    useUserStats,
} from "../../hooks/queries/useGameLogs";
import {
    useFriendRelation,
    useMyFriends,
    useUserFriends,
} from "../../hooks/queries/useFriends";
import { useUserReviews } from "../../hooks/queries/useReviews";
import { usePlatforms } from "../../hooks/queries/useGames";
import { useWindowSize } from "../../hooks/useWindowSize";
import { usePagination } from "../../hooks/usePagination";
import { usePageMeta } from "../../hooks/usePageMeta";
import { profileDescription } from "@playrates/shared";
import Button, { buttonClass } from "../../components/ui/Button";
import ProfileError from "./components/ProfileError";
import MemberFileHeader from "./components/MemberFileHeader";
import FriendAction from "./components/FriendAction";
import ShelfPanel from "./components/ShelfPanel";
import {
    OwnProfileVisibility,
    PrivateProfile,
} from "./components/PrivateProfile";
import { profileAccess } from "./lib/profileAccess";
import ShelfSort from "./components/ShelfSort";
import PlayedStatusFilterControl from "./components/PlayedStatusFilter";
import RecentReviews from "./components/RecentReviews";
import CommunityThreads, {
    COMMUNITY_THREADS_SHOWN,
} from "./components/CommunityThreads";
import { useThreads, useUserThreads } from "../../hooks/queries/useCommunity";
import FriendsPanel from "./components/FriendsPanel";
import ProfileModals, { type ProfileModal } from "./components/ProfileModals";
import { TextSkeleton } from "../../components/ui/Skeleton";
import type { TileAction } from "../../components/game/GameTile";
import { GAME_STATUSES, type GameStatus } from "../../constants/gameStatus";
import { getProfileGamesPerPage } from "./lib/friendRelation";
import { formatCount } from "../../lib/format";

interface ProfilePageProps {
    /** Guaranteed by ProfilePageRoute, so no hook here runs conditionally. */
    username: string;
}

const isGameStatus = (value: string): value is GameStatus =>
    (GAME_STATUSES as readonly string[]).includes(value);

const ProfilePage = ({ username: targetUsername }: ProfilePageProps) => {
    const { user: currentUser } = useAuth();
    const { openLogin } = useAccountForm();
    const notify = useNotify();
    const flow = useLogFlow();
    const { width } = useWindowSize();
    const [params, setParams] = useSearchParams();

    const rawType = params.get("type") ?? "played";
    const activeSection: GameStatus = isGameStatus(rawType)
        ? rawType
        : "played";
    const page = Math.max(1, Number(params.get("page")) || 1);
    const deepLinkedLog = params.get("log");

    /* In the URL alongside the tab, so a sorted shelf survives a reload and
       can be linked to. Anything unrecognised falls back to the default. */
    const rawSort = params.get("sort");
    const sort: GameLogSort = GAME_LOG_SORTS.includes(rawSort as GameLogSort)
        ? (rawSort as GameLogSort)
        : "rating";
    const direction: SortDirection =
        params.get("direction") === "asc" ? "asc" : "desc";

    const rawPlayed = params.get("ending");
    const playedStatus: PlayedStatusFilter | undefined =
        rawPlayed === "none" ||
        PLAYED_STATUSES.includes(rawPlayed as (typeof PLAYED_STATUSES)[number])
            ? (rawPlayed as PlayedStatusFilter)
            : undefined;

    const [modal, setModal] = useState<ProfileModal>(null);
    const [reportingProfile, setReportingProfile] = useState(false);
    const perPage = getProfileGamesPerPage(width);

    const {
        data: targetUser,
        error: targetUserError,
        isLoading: profileLoading,
    } = useProfile(targetUsername);

    /* The URL's spelling until the profile lands, then its own. */
    usePageMeta({
        title: targetUser?.username ?? targetUsername,
        description: targetUser
            ? profileDescription(targetUser.username, targetUser.bio)
            : null,
        image: targetUser?.avatarUrl,
        noindex: targetUser?.hideFromSearch,
    });

    const isMyAccount =
        !!currentUser && currentUser.username === targetUsername;

    const { data: myFriends } = useMyFriends();
    const { relation, send, accept, remove, isPending } = useFriendRelation(
        targetUser?.id
    );
    const access = targetUser
        ? profileAccess(targetUser.profileVisibility, {
              isOwner: isMyAccount,
              signedIn: !!currentUser,
              relation: currentUser && !myFriends ? undefined : relation,
          })
        : "unknown";
    const canSee = access === "visible";

    // Each tab pages independently.
    const { data: logsPage, isLoading: logsLoading } = useUserShelf(
        targetUsername,
        activeSection,
        {
            page,
            limit: perPage,
            sort,
            direction,
            // Only the played shelf has endings to filter by.
            playedStatus: activeSection === "played" ? playedStatus : undefined,
        },
        canSee
    );
    const { data: stats } = useUserStats(targetUsername, undefined, canSee);
    const { data: platforms } = usePlatforms();
    const { data: friends, isLoading: friendsLoading } = useUserFriends(
        targetUsername,
        canSee
    );
    const { data: reviewsPage, isLoading: reviewsLoading } = useUserReviews(
        targetUsername,
        canSee
    );
    const { data: threads, isLoading: threadsLoading } = useUserThreads(
        targetUsername,
        COMMUNITY_THREADS_SHOWN,
        canSee
    );
    // One row, for its total: "See all" says how many there are.
    const { data: threadTotal } = useThreads(
        { participant: targetUsername, limit: 1 },
        canSee && !!targetUsername
    );
    const { data: myLogIds } = useMyGameLogIds();

    const entries = useMemo(() => logsPage?.data ?? [], [logsPage]);
    const total = logsPage?.meta.total ?? 0;

    const pagination = usePagination({
        total,
        perPage,
        page,
        onPageChange: (next) => {
            const updated = new URLSearchParams(params);
            if (next > 1) updated.set("page", String(next));
            else updated.delete("page");
            setParams(updated);
        },
    });

    const setOrder = (next: {
        sort?: GameLogSort;
        direction?: SortDirection;
    }) => {
        const updated = new URLSearchParams(params);
        if (next.sort) updated.set("sort", next.sort);
        if (next.direction) updated.set("direction", next.direction);
        updated.delete("page"); // a reordered shelf starts again at the top
        setParams(updated);
    };

    const setEnding = (next: PlayedStatusFilter | undefined) => {
        const updated = new URLSearchParams(params);
        if (next) updated.set("ending", next);
        else updated.delete("ending");
        updated.delete("page");
        setParams(updated);
    };

    const setSection = (status: GameStatus) => {
        const updated = new URLSearchParams(params);
        updated.set("type", status);
        updated.delete("page"); // a new drawer opens at its own first page
        // No other shelf has endings, so the filter would be a lie in the URL.
        if (status !== "played") updated.delete("ending");
        setParams(updated);
    };

    const acceptedFriends = useMemo(
        () => (friends ?? []).filter((edge) => edge.status === "friend"),
        [friends]
    );

    const sharedFriendCount = useMemo(() => {
        if (isMyAccount || !myFriends) return undefined;
        const mine = new Set(
            myFriends.filter((e) => e.status === "friend").map((e) => e.user.id)
        );
        return acceptedFriends.filter((e) => mine.has(e.user.id)).length;
    }, [isMyAccount, myFriends, acceptedFriends]);

    const myLogGameIds = useMemo(
        () => new Set((myLogIds ?? []).map((entry) => entry.gameId)),
        [myLogIds]
    );

    const friendEdge = useMemo(
        () => (myFriends ?? []).find((e) => e.user.id === targetUser?.id),
        [myFriends, targetUser]
    );

    useEffect(() => {
        if (targetUserError) notify("Failed to fetch user data", "error");
    }, [targetUserError, notify]);

    /* deep link: /user/x?log=<gameId> opens their logs of that game, from
       whichever page of the shelf it's on. Once per link. */
    const openedLink = useRef<string | null>(null);
    useEffect(() => {
        const gameId = Number(deepLinkedLog);
        if (!deepLinkedLog || !gameId || openedLink.current === deepLinkedLog) {
            return;
        }
        openedLink.current = deepLinkedLog;
        flow.view(gameId, { owner: targetUsername });
    }, [deepLinkedLog, flow, targetUsername]);

    const guard = (action: () => void) => () => {
        if (!currentUser) return openLogin();
        action();
    };

    /* No confirmation: taking back a request you sent costs nothing and the
       button beside it sends another one. */
    const cancelRequest = async () => {
        try {
            await remove.mutateAsync();
            notify("Request cancelled", "success");
        } catch {
            notify("That action failed, please try again", "error");
        }
    };

    const buildTileActions = (entry: ShelfEntry): TileAction[] => {
        const { gameId } = entry;
        const actions: TileAction[] = [
            {
                key: "view",
                label: entry.logs.length > 1 ? "View logs" : "View log",
                tone: "primary",
                onSelect: () => flow.view(gameId, { owner: targetUsername }),
            },
        ];

        if (!currentUser) return actions;

        if (isMyAccount) {
            actions.push({
                key: "edit",
                label: "Edit",
                onSelect: () => flow.open(gameId),
            });
        } else if (myLogGameIds.has(gameId)) {
            actions.push({
                key: "myLog",
                label: "My log",
                onSelect: () => flow.view(gameId),
            });
        } else {
            actions.push({
                key: "add",
                label: "Log it",
                onSelect: () => flow.open(gameId),
            });
        }

        return actions;
    };

    if (profileLoading) return <TextSkeleton lines={6} />;
    if (targetUserError || !targetUser) return <ProfileError />;

    return (
        <div className="flex flex-col gap-6">
            <MemberFileHeader
                profile={targetUser}
                stats={stats}
                profileHidden={access === "hidden"}
                reviewCount={reviewsPage?.meta.total}
                friendCount={
                    friendsLoading ? undefined : acceptedFriends.length
                }
                onEditPicture={
                    isMyAccount
                        ? () => setModal({ kind: "editProfile" })
                        : undefined
                }
                action={
                    isMyAccount ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setModal({ kind: "editProfile" })
                                }
                                className="max-sm:min-h-11"
                            >
                                <Pencil size={15} aria-hidden />
                                Edit profile
                            </Button>
                            <Link
                                to="/settings"
                                aria-label="Settings"
                                className={buttonClass(
                                    "outline",
                                    "max-sm:size-11 max-sm:px-0",
                                    "sm"
                                )}
                            >
                                <Settings size={15} aria-hidden />
                                <span className="hidden sm:inline">
                                    Settings
                                </span>
                            </Link>
                        </>
                    ) : (
                        <>
                            {currentUser && targetUser && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    aria-label="Report this profile"
                                    title="Report this profile"
                                    onClick={() => setReportingProfile(true)}
                                    className="max-sm:size-11 max-sm:px-0"
                                >
                                    <Flag size={15} aria-hidden />
                                </Button>
                            )}
                            <FriendAction
                                relation={relation}
                                since={friendEdge?.createdAt}
                                isPending={isPending}
                                onAdd={guard(() => void send.mutateAsync())}
                                onAccept={guard(
                                    () => void accept.mutateAsync()
                                )}
                                onRemove={guard(() =>
                                    setModal({ kind: "removeFriend" })
                                )}
                                onCancel={guard(() => void cancelRequest())}
                            />
                        </>
                    )
                }
            />

            {/* Past the card, nothing: not the games, the reviews, the
                friends or the threads. */}
            {access === "hidden" &&
            targetUser.profileVisibility !== "everyone" ? (
                <PrivateProfile
                    username={targetUser.username}
                    visibility={targetUser.profileVisibility}
                    signedIn={!!currentUser}
                    relation={relation}
                />
            ) : (
                <>
                    <div className="flex flex-col gap-3">
                        {isMyAccount &&
                            targetUser.profileVisibility !== "everyone" && (
                                <OwnProfileVisibility
                                    visibility={targetUser.profileVisibility}
                                />
                            )}
                        <ShelfPanel
                            active={activeSection}
                            // Every tab's count: the stats endpoint returns the whole breakdown.
                            counts={
                                stats?.byStatus ?? { [activeSection]: total }
                            }
                            onSelect={setSection}
                            entries={entries}
                            platforms={platforms ?? []}
                            isLoading={logsLoading || access === "unknown"}
                            pagination={pagination}
                            perPage={perPage}
                            buildTileActions={buildTileActions}
                            isMyAccount={isMyAccount}
                            sort={sort}
                            trailing={
                                /* A row each below sm: side by side, the sort label had
                               60px and "Time played" and "Time to beat" both read
                               "Time…". */
                                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
                                    {!isMyAccount && myLogIds && (
                                        <span className="text-label text-accent max-sm:hidden">
                                            {formatCount(
                                                entries.filter((e) =>
                                                    myLogGameIds.has(e.gameId)
                                                ).length
                                            )}{" "}
                                            in common
                                        </span>
                                    )}
                                    {activeSection === "played" && (
                                        <PlayedStatusFilterControl
                                            value={playedStatus}
                                            onChange={setEnding}
                                        />
                                    )}
                                    <ShelfSort
                                        sort={sort}
                                        direction={direction}
                                        isMyAccount={isMyAccount}
                                        onChange={setOrder}
                                    />
                                </div>
                            }
                        />
                    </div>

                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <div className="flex min-w-0 flex-col gap-6">
                            <RecentReviews
                                reviews={reviewsPage?.data ?? []}
                                isLoading={reviewsLoading}
                                isOwner={isMyAccount}
                            />
                            <CommunityThreads
                                username={
                                    targetUser?.username ?? targetUsername
                                }
                                threads={threads ?? []}
                                total={threadTotal?.meta.total ?? 0}
                                isLoading={threadsLoading}
                                isOwner={isMyAccount}
                            />
                        </div>
                        <FriendsPanel
                            friends={acceptedFriends}
                            isLoading={friendsLoading}
                            sharedCount={sharedFriendCount}
                            pendingCount={
                                isMyAccount
                                    ? (friends ?? []).filter(
                                          (e) => e.status === "request-received"
                                      ).length
                                    : 0
                            }
                            onOpenFriends={() => setModal({ kind: "friends" })}
                            onOpenRequests={() =>
                                setModal({ kind: "friendRequests" })
                            }
                        />
                    </div>
                </>
            )}

            <ProfileModals
                modal={modal}
                setModal={setModal}
                targetUser={targetUser}
                isMyAccount={isMyAccount}
                allFriendEdges={friends ?? []}
                friendsLoading={friendsLoading}
                onRemoveFriend={async () => {
                    try {
                        await remove.mutateAsync();
                        notify("Friend removed", "success");
                    } catch {
                        notify("That action failed, please try again", "error");
                    }
                }}
            />

            {reportingProfile && targetUser && (
                <ReportDialog
                    targetType="profile"
                    targetId={targetUser.id}
                    onClose={() => setReportingProfile(false)}
                />
            )}
        </div>
    );
};

export default ProfilePage;
