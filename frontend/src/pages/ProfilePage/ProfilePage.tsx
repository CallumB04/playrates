import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import LoadingSpinner from "../../components/LoadingSpinner";
import ProfilePicture from "../../components/ProfilePicture";
import UserStatus from "../../components/UserStatus";
import GameTile, { type TileAction } from "../../components/game/GameTile";
import GameCover from "../../components/game/GameCover";
import Pagination from "../../components/ui/Pagination";
import FriendProfile from "../../components/FriendProfile";
import RemoveFriendPopup from "./components/RemoveFriendPopup";
import MobileSearchPopup from "./components/MobileSearchPopup";
import MobileGameSectionPopup from "./components/MobileGameSectionPopup";
import FriendsPopup from "./components/FriendsPopup";
import EditProfilePopup from "./components/EditProfilePopup";
import ViewGameLogPopup from "../../components/ViewGameLogPopup";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import DeleteGameLogPopup from "../../components/gamelog/DeleteGameLogPopup";
import {
    getProfileGamesPerPage,
    getUserRelationColors,
    getUserRelationIcon,
    getUserRelationText,
} from "./lib/friendRelation";

interface ProfilePageProps {
    /** Guaranteed by ProfilePageRoute, so no hook here runs conditionally. */
    username: string;
}

type OpenModal =
    | { kind: "view"; log: GameLogWithGame }
    | { kind: "edit"; log: GameLogWithGame }
    | { kind: "create"; log: GameLogWithGame }
    | { kind: "delete"; log: GameLogWithGame }
    | { kind: "removeFriend" }
    | { kind: "friends" }
    | { kind: "editProfile" }
    | { kind: "mobileSearch" }
    | { kind: "mobileSection" }
    | null;

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
    const [modal, setModal] = useState<OpenModal>(null);

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
                {/* Profile card */}
                <div className="card flex w-full min-w-[300px] flex-row items-start justify-between font-lexend lg:max-w-[300px] lg:flex-col lg:items-center">
                    <div className="flex w-full flex-row items-center gap-5 sm:gap-6 lg:flex-col lg:gap-7">
                        <h2 className="card-header-text hidden w-full lg:block">
                            Profile
                        </h2>
                        <div className="flex flex-col items-center gap-2">
                            <ProfilePicture
                                variant="profileHeader"
                                username={targetUser.username}
                                file={targetUser.pictureUrl ?? ""}
                                link={true}
                            />
                            {/* User status (online, offline, etc). Currently using test data for design purposes */}
                            <UserStatus
                                status={
                                    targetUser.online ? "online" : "offline"
                                }
                            />
                        </div>
                        <div className="flex w-3/5 flex-col gap-6 sm:max-w-full lg:w-full">
                            <div className="flex w-full flex-col gap-3">
                                <h2 className="overflow-hidden break-all text-left text-xl font-semibold text-content sm:text-2xl">
                                    {targetUser.username}
                                </h2>

                                <p className="line-clamp-3 text-balance break-words text-left text-sm font-light text-content-secondary sm:text-base lg:line-clamp-5">
                                    {targetUser.bio
                                        ? targetUser.bio
                                        : "User hasn't added a bio."}
                                </p>
                            </div>
                            <div className="hidden w-full flex-col gap-4 lg:flex">
                                {currentUser ? (
                                    <button
                                        className={`button-outline flex w-full items-center justify-center gap-4 ${isMyAccount ? "border-content text-content hover:border-brand hover:text-brand-hover" : getUserRelationColors(userRelation)}`}
                                        onMouseOver={() =>
                                            setIsHoveringProfileButton(true)
                                        }
                                        onMouseOut={() =>
                                            setIsHoveringProfileButton(false)
                                        }
                                        onClick={() => {
                                            if (isMyAccount) {
                                                setModal({
                                                    kind: "editProfile",
                                                });
                                            } else {
                                                void executeFriendAction();
                                            }
                                        }}
                                    >
                                        <p className="text-lg">
                                            {isMyAccount
                                                ? "Edit Profile"
                                                : getUserRelationText(
                                                      userRelation,
                                                      isHoveringProfileButton,
                                                      windowWidth < 1024
                                                  )}
                                        </p>
                                        <i
                                            className={`fas text-lg fa-${
                                                currentUser?.id ===
                                                targetUser?.id
                                                    ? "pen"
                                                    : getUserRelationIcon(
                                                          userRelation
                                                      )
                                            }`}
                                        />
                                    </button>
                                ) : (
                                    <button
                                        className="button-outline flex items-center justify-center gap-4 text-lg text-content hover:cursor-pointer hover:border-brand hover:text-brand"
                                        onClick={openLogin}
                                    >
                                        <p>Login to add</p>
                                        <i className="fas fa-right-to-bracket"></i>
                                    </button>
                                )}

                                {userRelation === "request-received" ? (
                                    <button
                                        className="button-outline flex w-full items-center justify-center gap-4 border-danger text-lg text-danger-soft hover:border-danger-strong hover:text-danger"
                                        onClick={declineFriendRequestAction}
                                    >
                                        <p>Decline Request</p>
                                        <i className="fas fa-user-xmark"></i>
                                    </button>
                                ) : (
                                    <></>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse items-center justify-end gap-3 sm:h-[148px] sm:flex-row sm:items-start lg:h-max lg:flex-col lg:gap-4">
                        {/* Friends list button */}
                        <div
                            className="group flex gap-3 hover:cursor-pointer lg:items-center 2xl:hidden"
                            onClick={() => setModal({ kind: "friends" })}
                        >
                            <i
                                className={`fas fa-users text-2xl text-content transition-colors duration-200 hover:cursor-pointer group-hover:text-brand sm:h-max lg:text-[22px]`}
                            ></i>
                            <p className="hidden text-xl text-content transition-colors duration-200 group-hover:text-brand lg:block lg:text-[22px]">
                                Friends
                            </p>
                        </div>
                        {/* Edit profile icon button (mobile) */}
                        {isMyAccount ? (
                            <i
                                className="fas fa-pen text-2xl text-content transition-colors duration-200 hover:cursor-pointer hover:text-brand lg:hidden lg:text-[22px]"
                                onClick={() =>
                                    setModal({ kind: "editProfile" })
                                }
                            ></i>
                        ) : (
                            <></>
                        )}
                        {/* Profile Settings button */}
                        {isMyAccount ? (
                            <div className="group flex gap-3 hover:cursor-pointer lg:items-center">
                                <i className="fas fa-cog text-2xl text-content transition-colors duration-200 group-hover:text-brand lg:text-[22px]"></i>
                                <p className="hidden text-xl text-content transition-colors duration-200 group-hover:text-brand lg:block lg:text-[22px]">
                                    Settings
                                </p>
                            </div>
                        ) : (
                            <></>
                        )}
                        {/* Remove friend button (mobile) */}
                        {userRelation === "friend" ? (
                            <i
                                className={`fas fa-${getUserRelationIcon(userRelation)} text-2xl text-content transition-colors duration-200 hover:cursor-pointer hover:text-brand lg:hidden lg:text-[22px]`}
                                onClick={executeFriendAction}
                            ></i>
                        ) : (
                            <></>
                        )}
                    </div>
                </div>
                {/* Friends buttons (add, remove, etc) on mobile */}
                {userRelation !== "friend" && !isMyAccount ? (
                    <div className="flex w-full flex-col gap-3 lg:hidden">
                        {userRelation === "request-received" ? (
                            <p className="text-center font-lexend text-content-secondary">
                                This user sent you a friend request!
                            </p>
                        ) : (
                            <></>
                        )}
                        {currentUser ? (
                            <div className="flex w-full gap-4">
                                <button
                                    className={`button-outline flex ${userRelation === "request-received" ? "w-1/2" : "w-full"} items-center justify-center gap-4 text-lg ${getUserRelationColors(userRelation)}`}
                                    onClick={executeFriendAction}
                                >
                                    <p>
                                        {getUserRelationText(
                                            userRelation,
                                            isHoveringProfileButton,
                                            windowWidth < 1024
                                        )}
                                    </p>
                                    <i
                                        className={`fas fa-${getUserRelationIcon(userRelation)}`}
                                    />
                                </button>
                                {userRelation === "request-received" ? (
                                    <button
                                        className="button-outline flex w-1/2 items-center justify-center gap-4 border-danger text-lg text-danger-soft hover:border-danger-strong hover:text-danger"
                                        onClick={declineFriendRequestAction}
                                    >
                                        <p>Decline</p>
                                        <i className="fas fa-user-xmark"></i>
                                    </button>
                                ) : (
                                    <></>
                                )}
                            </div>
                        ) : (
                            <button
                                className="button-outline flex items-center justify-center gap-4 text-lg text-content hover:cursor-pointer hover:border-brand hover:text-brand"
                                onClick={openLogin}
                            >
                                <p>Login to add</p>
                                <i className="fas fa-right-to-bracket"></i>
                            </button>
                        )}
                    </div>
                ) : (
                    <></>
                )}
                {/* Games card */}
                <div className="card relative w-full lg:flex-grow">
                    {/* Header */}
                    <div className="flex w-full justify-between">
                        <h2 className="card-header-text">Game Library</h2>

                        {/* Search bar and filter button */}
                        <div className="flex items-center gap-4 md:gap-5">
                            {/* Game Section (played, playing, etc) icon (mobile) */}
                            <i
                                className="fas fa-list hover-text-white text-xl md:hidden"
                                title="Game Section"
                                onClick={() =>
                                    setModal({ kind: "mobileSection" })
                                }
                            ></i>
                            {/* Filters icon (mobile) */}
                            <i
                                className="fas fa-filter hover-text-white text-xl md:hidden"
                                title="Filters"
                            ></i>
                            {/* Filters button */}
                            <button className="hover-text-white button-outline hidden h-11 items-center gap-3 hover:border-brand md:flex">
                                <p className="font-lexend">Filters</p>
                                <i
                                    className="fas fa-filter"
                                    title="Filters"
                                ></i>
                            </button>
                            {/* Search bar */}
                            <span className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for game..."
                                    className="search-bar hidden h-11 w-60 md:block xl:w-72"
                                />
                                <i
                                    className="fas fa-magnifying-glass relative text-xl text-content transition-colors hover:cursor-pointer hover:text-brand md:absolute md:right-1 md:top-1/2 md:-translate-y-1/2 md:transform md:p-2 md:text-base md:text-content-muted"
                                    title="Search"
                                    onClick={() => {
                                        if (windowWidth < 768)
                                            setModal({ kind: "mobileSearch" });
                                    }}
                                ></i>
                            </span>
                        </div>
                    </div>
                    {/* Game section navigation (played, playing, etc) */}
                    <div className="mx-auto mt-12 hidden w-max font-lexend text-lg text-content md:flex">
                        {["played", "playing", "backlog", "wishlist"].map(
                            (sectionName) => {
                                return (
                                    <p
                                        className={`w-36 border-b-4 pb-2 text-center 2xl:w-40 ${activeGamesSection === sectionName ? "border-b-brand-hover" : "border-b-subtle hover:border-b-brand"} transition-colors hover:cursor-pointer hover:text-brand-hover`}
                                        onClick={() =>
                                            setActiveGamesSection(sectionName)
                                        }
                                        key={sectionName}
                                    >
                                        {sectionName[0].toUpperCase() +
                                            sectionName.slice(1)}
                                    </p>
                                );
                            }
                        )}
                    </div>
                    {/* Game logs */}
                    {isSectionEmpty ? (
                        <h2 className="mt-16 text-center font-lexend text-2xl text-content-secondary">
                            No games found in {activeGamesSection}...
                        </h2>
                    ) : targetUserGameLogsLoading ? (
                        <span className="mt-16 flex items-center justify-center gap-4">
                            <LoadingSpinner size="md" />
                            <p className="font-lexend text-xl tracking-wide text-content">
                                Loading Game Logs...
                            </p>
                        </span>
                    ) : targetUserGameLogs ? (
                        <div className="mt-6 flex w-full flex-wrap justify-center">
                            {visibleLogs.map((gameLog) => (
                                <GameTile
                                    key={gameLog.id}
                                    gameId={gameLog.gameId}
                                    title={gameLog.game?.title ?? ""}
                                    coverUrl={gameLog.game?.coverUrl ?? null}
                                    variant="profile"
                                    showMenu
                                    actions={buildTileActions(gameLog)}
                                    popupIsVisible={modal !== null}
                                />
                            ))}
                        </div>
                    ) : (
                        <></>
                    )}
                    <div className="lg:absolute lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:transform">
                        <Pagination pagination={pagination} />
                    </div>
                </div>

                {/* Friends / Reviews */}
                <div className="hidden min-w-[300px] max-w-[300px] flex-col gap-5 2xl:flex">
                    <div className="card relative h-3/5 w-full">
                        <span className="flex items-center justify-between">
                            <h2 className="card-header-text">Friends</h2>
                            {targetUserFriends &&
                            targetUserFriends.some(
                                (friend) => friend.status === "friend"
                            ) ? (
                                <p className="text-center font-lexend font-light text-content-secondary">
                                    <span>
                                        {
                                            acceptedFriends.filter(
                                                (f) => f.user.online
                                            ).length
                                        }
                                    </span>
                                    /<span>{acceptedFriends?.length}</span>{" "}
                                    Online
                                </p>
                            ) : (
                                <></>
                            )}
                        </span>
                        {/* List of friends, scrollable on overflow */}
                        {targetUserFriendsLoading ? (
                            <span className="absolute left-0 top-0 flex h-full w-full items-center justify-center">
                                <LoadingSpinner size="lg" />
                            </span>
                        ) : (
                            <div className="mt-2 flex max-h-[400px] flex-col gap-1 overflow-y-scroll">
                                {acceptedFriends?.map((friend) => {
                                    return (
                                        <FriendProfile
                                            key={friend.user.id}
                                            user={friend.user}
                                            density="compact"
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="card h-2/5 w-full">
                        <h2 className="card-header-text">Reviews</h2>
                        <div className="mt-2 flex h-[248px] flex-col gap-1 overflow-y-scroll">
                            {targetUserReviews?.map((review) => (
                                <Link
                                    key={review.id}
                                    to={`/game/${review.gameId}`}
                                    className="flex h-20 items-center gap-3 rounded-md p-2 transition-colors duration-200 hover:bg-surface-popup-to"
                                >
                                    <GameCover
                                        coverUrl={
                                            gameCoverById.get(review.gameId) ??
                                            null
                                        }
                                        title=""
                                        className="game-cover h-full object-cover"
                                    />
                                    <div className="flex flex-col gap-1">
                                        <span className="flex items-center gap-1 text-xs text-content">
                                            <p className="font-semibold tracking-wider">
                                                {review.rating ?? "?"}
                                                /10
                                            </p>
                                            <i className="fas fa-star text-brand"></i>
                                        </span>
                                        <p className="line-clamp-2 h-max text-sm text-content-secondary">
                                            {review.body}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Popups */}
                {modal?.kind === "removeFriend" && (
                    <RemoveFriendPopup
                        closePopup={() => setModal(null)}
                        confirmRemove={async () => {
                            try {
                                await remove.mutateAsync();
                                notify("Friend removed", "success");
                            } catch {
                                notify("Failed to remove friend", "error");
                            }
                            setModal(null);
                        }}
                        friendName={targetUser.username}
                    />
                )}

                {modal?.kind === "mobileSearch" && (
                    <MobileSearchPopup
                        closePopup={() => setModal(null)}
                        onSearch={() => {}}
                    />
                )}

                {modal?.kind === "mobileSection" && (
                    <MobileGameSectionPopup
                        closePopup={() => setModal(null)}
                        currentActiveSection={activeGamesSection}
                        selectSection={(section) => {
                            setActiveGamesSection(section);
                            navigate(
                                `/user/${targetUser.username}?type=${section}`
                            );
                        }}
                    />
                )}

                {modal?.kind === "friends" && (
                    <FriendsPopup
                        closePopup={() => setModal(null)}
                        friends={acceptedFriends}
                        friendsLoading={targetUserFriendsLoading}
                    />
                )}

                {modal?.kind === "editProfile" && (
                    <EditProfilePopup
                        closePopup={() => setModal(null)}
                        user={targetUser}
                    />
                )}

                {modal?.kind === "view" && (
                    <ViewGameLogPopup
                        closePopup={() => setModal(null)}
                        gamelog={modal.log}
                        isMyAccount={isMyAccount}
                        userLoggedIn={!!currentUser}
                        currentUserSharesLog={currentUserGameLogs.some(
                            (l) => l.gameId === modal.log.gameId
                        )}
                        openEdit={() =>
                            setModal({ kind: "edit", log: modal.log })
                        }
                        openCreate={() =>
                            setModal({ kind: "create", log: modal.log })
                        }
                        redirectAndOpenView={() =>
                            navigate(
                                `/user/${currentUser?.username}?log=${modal.log.gameId}`
                            )
                        }
                        profilePage
                    />
                )}

                {modal?.kind === "edit" && (
                    <CreateOrEditGameLogPopup
                        closePopup={() => setModal(null)}
                        gamelog={modal.log}
                        editing
                        viewUpdatedLog={() => setModal(null)}
                    />
                )}

                {modal?.kind === "create" && (
                    <CreateOrEditGameLogPopup
                        closePopup={() => setModal(null)}
                        gameID={modal.log.gameId}
                        editing={false}
                        viewUpdatedLog={() => setModal(null)}
                    />
                )}

                {modal?.kind === "delete" && (
                    <DeleteGameLogPopup
                        closePopup={() => setModal(null)}
                        gameLog={modal.log}
                    />
                )}
            </div>
        );
    }

    // not loading, not errored, but no user came back
    return <ProfileError />;
};

export default ProfilePage;
