import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { GameLogWithGame } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useProfile } from "../../hooks/queries/useProfiles";
import {
    useUserGameLogs,
    useMyGameLogs,
} from "../../hooks/queries/useGameLogs";
import {
    useUserFriends,
    useFriendRelation,
} from "../../hooks/queries/useFriends";
import { useUserReviews } from "../../hooks/queries/useReviews";
import { useWindowSize } from "../../hooks/useWindowSize";
import { usePagination } from "../../hooks/usePagination";
import ProfileError from "./components/ProfileError";
import ProfileSidebar from "./components/ProfileSidebar";
import GameLibraryPanel from "./components/GameLibraryPanel";
import ProfileFriendsCard from "./components/ProfileFriendsCard";
import ProfileReviewsCard from "./components/ProfileReviewsCard";
import ProfileModals, { type ProfileModal } from "./components/ProfileModals";
import LoadingSpinner from "../../components/LoadingSpinner";
import type { TileAction } from "../../components/game/GameTile";
import { getProfileGamesPerPage } from "./lib/friendRelation";

interface ProfilePageProps {
    /** Guaranteed by ProfilePageRoute, so no hook here runs conditionally. */
    username: string;
}

const ProfilePage = ({ username: targetUsername }: ProfilePageProps) => {
    const { user: currentUser } = useAuth();
    const { openLogin } = useAccountForm();
    const notify = useNotify();
    const navigate = useNavigate();
    const location = useLocation();
    const { width: windowWidth } = useWindowSize();

    const urlParams = new URLSearchParams(location.search);
    const URLGamesSection = urlParams.get("type") || "played";
    const URLGameLog = urlParams.get("log");

    const [activeGamesSection, setActiveGamesSection] =
        useState<string>(URLGamesSection);
    const [isHoveringProfileButton, setIsHoveringProfileButton] =
        useState(false);
    const [modal, setModal] = useState<ProfileModal>(null);

    // --- data -------------------------------------------------------------
    const {
        data: targetUser,
        error: targetUserError,
        isLoading: targetUserLoading,
    } = useProfile(targetUsername);

    const isMyAccount =
        !!currentUser && currentUser.username === targetUsername;

    const { data: targetLogsPage, isLoading: targetUserGameLogsLoading } =
        useUserGameLogs(targetUsername);
    const { data: myLogsPage } = useMyGameLogs();
    const { data: targetUserFriends, isLoading: targetUserFriendsLoading } =
        useUserFriends(targetUsername);
    const { data: targetReviewsPage } = useUserReviews(targetUsername);

    const targetUserGameLogs = useMemo(
        () => targetLogsPage?.data ?? [],
        [targetLogsPage]
    );
    const currentUserGameLogs = useMemo(
        () => myLogsPage?.data ?? [],
        [myLogsPage]
    );
    const targetUserReviews = useMemo(
        () => targetReviewsPage?.data ?? [],
        [targetReviewsPage]
    );

    // reviews carry only a gameId; the logs already embed the game, so the
    // covers come from there rather than from a request per review
    const gameCoverById = useMemo(
        () =>
            new Map(
                targetUserGameLogs
                    .filter((log) => log.game?.coverUrl)
                    .map((log) => [log.gameId, log.game!.coverUrl!])
            ),
        [targetUserGameLogs]
    );

    // friends already carry the other user embedded, so there is no longer a
    // request per friend to resolve names and avatars
    const acceptedFriends = useMemo(
        () => (targetUserFriends ?? []).filter((f) => f.status === "friend"),
        [targetUserFriends]
    );

    const {
        relation: userRelation,
        send,
        accept,
        remove,
    } = useFriendRelation(targetUser?.id);

    // --- game section + pagination ---------------------------------------
    const sectionLogs = useMemo(
        () =>
            targetUserGameLogs.filter(
                (log) => log.status === activeGamesSection
            ),
        [targetUserGameLogs, activeGamesSection]
    );

    const isSectionEmpty =
        !targetUserGameLogsLoading && sectionLogs.length === 0;

    const gamesPerPage = getProfileGamesPerPage(windowWidth);
    const pagination = usePagination({
        total: sectionLogs.length,
        perPage: gamesPerPage,
    });

    const visibleLogs = pagination.slice(sectionLogs);

    useEffect(() => {
        setActiveGamesSection(URLGamesSection);
    }, [URLGamesSection]);

    // deep link: /user/x?log=<gameId> opens that log
    useEffect(() => {
        if (!URLGameLog || targetUserGameLogs.length === 0) return;
        const log = targetUserGameLogs.find(
            (l) => l.gameId === Number(URLGameLog)
        );
        if (log) setModal({ kind: "view", log });
    }, [URLGameLog, targetUserGameLogs]);

    useEffect(() => {
        if (targetUserError) notify("Failed to fetch user data", "error");
    }, [targetUserError, notify]);

    // --- friend actions ---------------------------------------------------
    const executeFriendAction = async () => {
        if (!currentUser) {
            openLogin();
            return;
        }

        try {
            switch (userRelation) {
                case "friend":
                    setModal({ kind: "removeFriend" });
                    return;
                case "request-sent":
                    await remove.mutateAsync();
                    notify("Friend Request cancelled", "success");
                    return;
                case "request-received":
                    await accept.mutateAsync();
                    notify("Friend Request accepted", "success");
                    return;
                default:
                    await send.mutateAsync();
                    notify("Friend Request sent", "success");
            }
        } catch {
            notify("That action failed, please try again", "error");
        }
    };

    const declineFriendRequestAction = async () => {
        try {
            await remove.mutateAsync();
            notify("Friend Request declined", "success");
        } catch {
            notify("Failed to decline Friend Request", "error");
        }
    };

    const buildTileActions = (log: GameLogWithGame): TileAction[] => {
        const actions: TileAction[] = [
            {
                key: "view",
                label: "View",
                icon: "fas fa-eye",
                onSelect: () => setModal({ kind: "view", log }),
            },
        ];

        if (!currentUser) return actions;

        const sharesLog =
            !isMyAccount &&
            currentUserGameLogs.some((l) => l.gameId === log.gameId);

        if (sharesLog) {
            actions.push({
                key: "myLog",
                label: "My Log",
                icon: "fas fa-arrow-up-right-from-square",
                onSelect: () =>
                    navigate(`/user/${currentUser.username}?log=${log.gameId}`),
            });
        } else {
            actions.push({
                key: isMyAccount ? "edit" : "add",
                label: isMyAccount ? "Edit" : "Add",
                icon: isMyAccount ? "fas fa-pen-to-square" : "fas fa-add",
                onSelect: () =>
                    setModal({
                        kind: isMyAccount ? "edit" : "create",
                        log,
                    }),
            });
        }

        if (isMyAccount) {
            actions.push({
                key: "delete",
                label: "Delete",
                icon: "fas fa-trash",
                tone: "danger",
                onSelect: () => setModal({ kind: "delete", log }),
            });
        }

        return actions;
    };

    // no username in the URL, or the user doesn't exist / failed to fetch
    if (!targetUsername || targetUserError) {
        return <ProfileError />;
    }

    // show user that profile is being loaded
    if (targetUserLoading) {
        return (
            <div className="absolute left-0 top-0 flex h-[calc(100vh-64px)] w-screen items-center justify-center">
                <div className="mx-auto flex h-full w-max flex-row items-center justify-center gap-6">
                    <LoadingSpinner size="md" />
                    <p className="font-lexend text-xl tracking-wide text-content">
                        Loading User Profile...
                    </p>
                </div>
            </div>
        );
    }

    // successful user profile load
    if (targetUser) {
        return (
            <div className="flex w-full flex-col gap-5 overflow-hidden lg:h-[85vh] lg:flex-row">
                <ProfileSidebar
                    targetUser={targetUser}
                    isMyAccount={isMyAccount}
                    isSignedIn={!!currentUser}
                    userRelation={userRelation}
                    isCompact={windowWidth < 1024}
                    isHoveringProfileButton={isHoveringProfileButton}
                    onHoverProfileButton={setIsHoveringProfileButton}
                    onPrimaryAction={() => {
                        if (isMyAccount) {
                            setModal({ kind: "editProfile" });
                        } else {
                            void executeFriendAction();
                        }
                    }}
                    onDeclineRequest={() => void declineFriendRequestAction()}
                    onRequireSignIn={openLogin}
                    onOpenFriends={() => setModal({ kind: "friends" })}
                    onOpenEditProfile={() => setModal({ kind: "editProfile" })}
                    onRemoveFriend={() => setModal({ kind: "removeFriend" })}
                />

                <GameLibraryPanel
                    activeSection={activeGamesSection}
                    onSelectSection={setActiveGamesSection}
                    visibleLogs={visibleLogs}
                    isLoading={targetUserGameLogsLoading}
                    isEmpty={isSectionEmpty}
                    pagination={pagination}
                    buildTileActions={buildTileActions}
                    isModalOpen={modal !== null}
                    isCompact={windowWidth < 768}
                    onOpenMobileSearch={() =>
                        setModal({ kind: "mobileSearch" })
                    }
                    onOpenMobileSections={() =>
                        setModal({ kind: "mobileSection" })
                    }
                />

                {/* Friends / Reviews rails */}
                <div className="hidden min-w-[300px] max-w-[300px] flex-col gap-5 2xl:flex">
                    <ProfileFriendsCard
                        friends={acceptedFriends}
                        isLoading={targetUserFriendsLoading}
                    />
                    <ProfileReviewsCard
                        reviews={targetUserReviews}
                        coversByGameId={gameCoverById}
                    />
                </div>

                <ProfileModals
                    modal={modal}
                    setModal={setModal}
                    targetUser={targetUser}
                    isMyAccount={isMyAccount}
                    isSignedIn={!!currentUser}
                    currentUsername={currentUser?.username}
                    currentUserGameLogs={currentUserGameLogs}
                    acceptedFriends={acceptedFriends}
                    friendsLoading={targetUserFriendsLoading}
                    activeGamesSection={activeGamesSection}
                    onSelectSection={(section) => {
                        setActiveGamesSection(section);
                        navigate(
                            `/user/${targetUser.username}?type=${section}`
                        );
                    }}
                    onRemoveFriend={async () => {
                        try {
                            await remove.mutateAsync();
                            notify("Friend removed", "success");
                        } catch {
                            notify("Failed to remove friend", "error");
                        }
                        setModal(null);
                    }}
                    navigate={navigate}
                />
            </div>
        );
    }

    // not loading, not errored, but no user came back
    return <ProfileError />;
};

export default ProfilePage;
