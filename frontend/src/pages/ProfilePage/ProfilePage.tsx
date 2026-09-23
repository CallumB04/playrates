import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Moon, Pencil, Settings, Sun } from "lucide-react";
import type { GameLogWithGame } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useProfile } from "../../hooks/queries/useProfiles";
import {
    useMyGameLogIds,
    useUserGameLogs,
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
import { usePageTitle } from "../../hooks/usePageTitle";
import Button, { buttonClass } from "../../components/ui/Button";
import ProfileError from "./components/ProfileError";
import MemberFileHeader from "./components/MemberFileHeader";
import FriendAction from "./components/FriendAction";
import ShelfPanel from "./components/ShelfPanel";
import RecentReviews from "./components/RecentReviews";
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
    const { theme, toggleTheme } = useTheme();
    const { openLogin } = useAccountForm();
    const notify = useNotify();
    const navigate = useNavigate();
    const { width } = useWindowSize();
    const [params, setParams] = useSearchParams();

    const rawType = params.get("type") ?? "played";
    const activeSection: GameStatus = isGameStatus(rawType)
        ? rawType
        : "played";
    const page = Math.max(1, Number(params.get("page")) || 1);
    const deepLinkedLog = params.get("log");

    const [modal, setModal] = useState<ProfileModal>(null);
    const perPage = getProfileGamesPerPage(width);

    const {
        data: targetUser,
        error: targetUserError,
        isLoading: profileLoading,
    } = useProfile(targetUsername);

    /* The URL's spelling until the profile lands, then its own. */
    usePageTitle(targetUser?.username ?? targetUsername);

    const isMyAccount =
        !!currentUser && currentUser.username === targetUsername;

    // Each tab pages independently.
    const { data: logsPage, isLoading: logsLoading } = useUserGameLogs(
        targetUsername,
        activeSection,
        { page, limit: perPage }
    );
    const { data: stats } = useUserStats(targetUsername);
    const { data: platforms } = usePlatforms();
    const { data: friends, isLoading: friendsLoading } =
        useUserFriends(targetUsername);
    const { data: myFriends } = useMyFriends();
    const { data: reviewsPage, isLoading: reviewsLoading } =
        useUserReviews(targetUsername);
    const { data: myLogIds } = useMyGameLogIds();

    const logs = useMemo(() => logsPage?.data ?? [], [logsPage]);
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

    const setSection = (status: GameStatus) => {
        const updated = new URLSearchParams(params);
        updated.set("type", status);
        updated.delete("page"); // a new drawer opens at its own first page
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

    const { relation, send, accept, remove, isPending } = useFriendRelation(
        targetUser?.id
    );
    const friendEdge = useMemo(
        () => (myFriends ?? []).find((e) => e.user.id === targetUser?.id),
        [myFriends, targetUser]
    );

    useEffect(() => {
        if (targetUserError) notify("Failed to fetch user data", "error");
    }, [targetUserError, notify]);

    // deep link: /user/x?log=<gameId> opens that log
    useEffect(() => {
        if (!deepLinkedLog || logs.length === 0) return;
        const log = logs.find((l) => l.gameId === Number(deepLinkedLog));
        if (log) setModal({ kind: "view", log });
    }, [deepLinkedLog, logs]);

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

    const buildTileActions = (log: GameLogWithGame): TileAction[] => {
        const actions: TileAction[] = [
            {
                key: "view",
                label: "View log",
                tone: "primary",
                onSelect: () => setModal({ kind: "view", log }),
            },
        ];

        if (!currentUser) return actions;

        if (isMyAccount) {
            actions.push({
                key: "edit",
                label: "Edit",
                onSelect: () => setModal({ kind: "edit", log }),
            });
        } else if (myLogGameIds.has(log.gameId)) {
            actions.push({
                key: "myLog",
                label: "My log",
                onSelect: () =>
                    navigate(`/user/${currentUser.username}?log=${log.gameId}`),
            });
        } else {
            actions.push({
                key: "add",
                label: "Log it",
                onSelect: () => setModal({ kind: "create", log }),
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
                reviewCount={reviewsPage?.meta.total}
                friendCount={
                    friendsLoading ? undefined : acceptedFriends.length
                }
                action={
                    isMyAccount ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                aria-label={
                                    theme === "dark"
                                        ? "Switch to day"
                                        : "Switch to night"
                                }
                                title={
                                    theme === "dark"
                                        ? "Switch to day"
                                        : "Switch to night"
                                }
                                onClick={toggleTheme}
                                className="max-sm:size-11 max-sm:px-0"
                            >
                                {theme === "dark" ? (
                                    <Sun size={15} aria-hidden />
                                ) : (
                                    <Moon size={15} aria-hidden />
                                )}
                                <span className="hidden sm:inline">
                                    {theme === "dark" ? "Day" : "Night"}
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setModal({ kind: "editProfile" })
                                }
                                className="max-sm:size-11 max-sm:px-0"
                            >
                                <Pencil size={15} aria-hidden />
                                <span className="hidden sm:inline">
                                    Edit profile
                                </span>
                            </Button>
                            <Link
                                to="/settings"
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
                        <FriendAction
                            relation={relation}
                            since={friendEdge?.createdAt}
                            isPending={isPending}
                            onAdd={guard(() => void send.mutateAsync())}
                            onAccept={guard(() => void accept.mutateAsync())}
                            onRemove={guard(() =>
                                setModal({ kind: "removeFriend" })
                            )}
                            onCancel={guard(() => void cancelRequest())}
                        />
                    )
                }
            />

            <ShelfPanel
                active={activeSection}
                // Every tab's count: the stats endpoint returns the whole breakdown.
                counts={stats?.byStatus ?? { [activeSection]: total }}
                onSelect={setSection}
                logs={logs}
                platforms={platforms ?? []}
                isLoading={logsLoading}
                pagination={pagination}
                perPage={perPage}
                buildTileActions={buildTileActions}
                isMyAccount={isMyAccount}
                trailing={
                    !isMyAccount && myLogIds ? (
                        <span className="text-label text-accent">
                            {formatCount(
                                logs.filter((l) => myLogGameIds.has(l.gameId))
                                    .length
                            )}{" "}
                            in common
                        </span>
                    ) : undefined
                }
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <RecentReviews
                    reviews={reviewsPage?.data ?? []}
                    isLoading={reviewsLoading}
                    isOwner={isMyAccount}
                />
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
                    onOpenRequests={() => setModal({ kind: "friendRequests" })}
                />
            </div>

            <ProfileModals
                modal={modal}
                setModal={setModal}
                targetUser={targetUser}
                isMyAccount={isMyAccount}
                isSignedIn={!!currentUser}
                currentUsername={currentUser?.username}
                myLogGameIds={myLogGameIds}
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
                navigate={navigate}
            />
        </div>
    );
};

export default ProfilePage;
