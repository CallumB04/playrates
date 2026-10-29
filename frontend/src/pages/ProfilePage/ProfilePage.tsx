import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Flag, Image as ImageIcon, Lock, Pencil, Settings } from "lucide-react";
import ReportDialog from "../../components/ReportDialog";
import { useLogFlow } from "../../components/gamelog/useLogFlow";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useProfile } from "../../hooks/queries/useProfiles";
import { useUserStats } from "../../hooks/queries/useGameLogs";
import {
    useFriendRelation,
    useMyFriends,
    useUserFriends,
} from "../../hooks/queries/useFriends";
import { useUserReviews } from "../../hooks/queries/useReviews";
import { useThreads } from "../../hooks/queries/useCommunity";
import { usePageMeta } from "../../hooks/usePageMeta";
import { BACKGROUND_LEVEL, profileDescription } from "@playrates/shared";
import Button, { buttonClass } from "../../components/ui/Button";
import PageBackdrop, {
    SHORT_BACKDROP_OFFSET,
} from "../../components/layout/PageBackdrop";
import { cn } from "../../lib/cn";
import ProfileError from "./components/ProfileError";
import MemberFileHeader from "./components/MemberFileHeader";
import FriendAction from "./components/FriendAction";
import FriendRequestBand from "./components/FriendRequestBand";
import ProfileNav from "./components/ProfileNav";
import {
    OwnProfileVisibility,
    PrivateProfile,
} from "./components/PrivateProfile";
import { profileAccess } from "./lib/profileAccess";
import type { ProfileTab } from "./lib/profileViews";
import { useEditParam } from "./lib/useEditParam";
import ProfileModals, { type ProfileModal } from "./components/ProfileModals";
import { TextSkeleton } from "../../components/ui/Skeleton";
import GamesView from "./views/GamesView";
import ProfileView, { ProfileAbout } from "./views/ProfileView";
import ReviewList, { REVIEWS_PER_PAGE } from "./components/ReviewList";
import ThreadList, { THREADS_PER_PAGE } from "./components/ThreadList";
import FriendsView from "./views/FriendsView";
import BadgesView from "./views/BadgesView";
import ListsView, {
    DEFAULT_LIST_SORT,
    LISTS_PER_PAGE,
} from "./views/ListsView";
import { useUserLists } from "../../hooks/queries/useLists";

interface ProfilePageProps {
    /** Guaranteed by ProfilePageRoute, so no hook here runs conditionally. */
    username: string;
    tab: ProfileTab;
}

/** The card, the views' nav, and whichever view the URL names. */
const ProfilePage = ({ username: targetUsername, tab }: ProfilePageProps) => {
    const { user: currentUser } = useAuth();
    const { openSignup } = useAccountForm();
    const notify = useNotify();
    const flow = useLogFlow();
    const [params] = useSearchParams();
    const deepLinkedLog = params.get("log");

    const [modal, setModal] = useState<ProfileModal>(null);
    const [reportingProfile, setReportingProfile] = useState(false);

    const {
        data: targetUser,
        error: targetUserError,
        isLoading: profileLoading,
    } = useProfile(targetUsername);

    /* The URL's spelling until the profile lands, then its own. */
    const name = targetUser?.username ?? targetUsername;
    usePageMeta({
        // "devuser" on the profile, "devuser’s reviews" past it.
        title: tab === "profile" ? name : `${name}’s ${tab}`,
        description: targetUser
            ? profileDescription(targetUser.username, targetUser.bio)
            : null,
        image: targetUser?.avatarUrl,
        noindex: targetUser?.hideFromSearch,
    });

    const isMyAccount =
        !!currentUser && currentUser.username === targetUsername;
    // `?edit=profile` opens the editor: Settings and the welcome send you
    // here for the profile's own fields.
    const [askedToEdit, doneEditing] = useEditParam("profile");
    const shownModal: ProfileModal =
        modal ?? (askedToEdit && isMyAccount ? { kind: "editProfile" } : null);

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

    const { data: stats } = useUserStats(targetUsername, undefined, canSee);
    const { data: friends, isLoading: friendsLoading } = useUserFriends(
        targetUsername,
        canSee
    );
    /* Each list's first page, for the tabs' counts. The same query as the
       view's own, so opening it costs nothing. */
    const { data: reviewsPage } = useUserReviews(targetUsername, {
        page: 1,
        limit: REVIEWS_PER_PAGE,
        enabled: canSee,
    });
    const { data: threadsPage } = useThreads(
        {
            participant: targetUsername,
            sort: "active",
            page: 1,
            limit: THREADS_PER_PAGE,
        },
        canSee
    );
    const { data: listsPage } = useUserLists(targetUsername, {
        sort: DEFAULT_LIST_SORT,
        page: 1,
        limit: LISTS_PER_PAGE,
        enabled: canSee,
    });
    const reviewCount = reviewsPage?.meta.total;
    // Each game once, though it can sit on more than one shelf.
    const gameCount = stats?.gameCount;
    const threadCount = threadsPage?.meta.total;

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

    const friendEdge = useMemo(
        () => (myFriends ?? []).find((e) => e.user.id === targetUser?.id),
        [myFriends, targetUser]
    );

    useEffect(() => {
        if (targetUserError) notify("Failed to fetch user data", "error");
    }, [targetUserError, notify]);

    /* deep link: /user/x?log=<gameId> opens their logs of that game, on
       whichever view and page of the shelf it lands. Once per link. */
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
        if (!currentUser) return openSignup();
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

    const pendingCount = isMyAccount
        ? (friends ?? []).filter((e) => e.status === "request-received").length
        : 0;

    if (profileLoading) return <TextSkeleton lines={6} />;
    if (targetUserError || !targetUser) return <ProfileError />;

    return (
        <div
            className={cn(
                "flex flex-col gap-6",
                targetUser.background && SHORT_BACKDROP_OFFSET
            )}
        >
            {targetUser.background && (
                <PageBackdrop
                    url={targetUser.background.url}
                    position={targetUser.background.position}
                    size="short"
                />
            )}
            <MemberFileHeader
                profile={targetUser}
                stats={canSee ? stats : undefined}
                friendsSince={
                    relation === "friend" ? friendEdge?.createdAt : undefined
                }
                request={
                    relation === "request-received" && (
                        <FriendRequestBand
                            profile={targetUser}
                            isPending={isPending}
                            onAccept={guard(() => void accept.mutateAsync())}
                            onDecline={guard(() =>
                                setModal({ kind: "removeFriend" })
                            )}
                        />
                    )
                }
                onEditPicture={
                    isMyAccount
                        ? () => setModal({ kind: "editProfile" })
                        : undefined
                }
                /* Solid, not outlined: they can sit on a picture, where an
                   outline vanishes into a busy or a light one. */
                action={
                    isMyAccount ? (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    setModal({ kind: "editProfile" })
                                }
                                className="max-sm:min-h-11 max-sm:flex-1"
                            >
                                <Pencil size={15} aria-hidden />
                                Edit profile
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                aria-label="Profile background"
                                onClick={() => setModal({ kind: "background" })}
                                className="max-sm:size-11 max-sm:px-0"
                            >
                                {targetUser.level < BACKGROUND_LEVEL ? (
                                    <Lock size={15} aria-hidden />
                                ) : (
                                    <ImageIcon size={15} aria-hidden />
                                )}
                                <span className="hidden sm:inline">
                                    Background
                                </span>
                            </Button>
                            <Link
                                to="/settings"
                                aria-label="Settings"
                                className={buttonClass(
                                    "secondary",
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
                            <FriendAction
                                relation={relation}
                                isPending={isPending}
                                onAdd={guard(() => void send.mutateAsync())}
                                onRemove={guard(() =>
                                    setModal({ kind: "removeFriend" })
                                )}
                                onCancel={guard(() => void cancelRequest())}
                                className="max-sm:flex-1"
                            />
                            {currentUser && targetUser && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    aria-label="Report this profile"
                                    title="Report this profile"
                                    onClick={() => setReportingProfile(true)}
                                    className="max-sm:size-11 max-sm:px-0"
                                >
                                    <Flag size={15} aria-hidden />
                                </Button>
                            )}
                        </>
                    )
                }
            />

            {/* Past the card, nothing: not the games, the reviews, the
                friends or the threads. */}
            {access === "hidden" &&
            targetUser.profileVisibility !== "everyone" ? (
                <div className="flex flex-col gap-4">
                    <ProfileAbout
                        profile={targetUser}
                        isOwner={isMyAccount}
                        onEditProfile={() => setModal({ kind: "editProfile" })}
                    />
                    <PrivateProfile
                        username={targetUser.username}
                        visibility={targetUser.profileVisibility}
                        signedIn={!!currentUser}
                        relation={relation}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <ProfileNav
                        username={targetUser.username}
                        active={tab}
                        counts={{
                            games: gameCount,
                            reviews: reviewCount,
                            lists: listsPage?.meta.total,
                            community: threadCount,
                            friends: friends
                                ? acceptedFriends.length
                                : undefined,
                        }}
                        requestCount={pendingCount}
                    />
                    {isMyAccount &&
                        targetUser.profileVisibility !== "everyone" && (
                            <OwnProfileVisibility
                                visibility={targetUser.profileVisibility}
                            />
                        )}
                    {tab === "profile" && (
                        <ProfileView
                            profile={targetUser}
                            isOwner={isMyAccount}
                            canSee={canSee}
                            onEditProfile={() =>
                                setModal({ kind: "editProfile" })
                            }
                        />
                    )}
                    {tab === "games" && (
                        <GamesView
                            username={targetUsername}
                            isMyAccount={isMyAccount}
                            stats={stats}
                            canSee={canSee}
                        />
                    )}
                    {tab === "reviews" && (
                        <ReviewList
                            username={targetUsername}
                            isOwner={isMyAccount}
                            canSee={canSee}
                        />
                    )}
                    {tab === "lists" && (
                        <ListsView
                            username={targetUsername}
                            isOwner={isMyAccount}
                            canSee={canSee}
                        />
                    )}
                    {tab === "badges" && (
                        <BadgesView
                            username={targetUsername}
                            isOwner={isMyAccount}
                        />
                    )}
                    {tab === "community" && (
                        <ThreadList
                            username={targetUsername}
                            isOwner={isMyAccount}
                            canSee={canSee}
                        />
                    )}
                    {tab === "friends" && (
                        <FriendsView
                            edges={friends ?? []}
                            isLoading={friendsLoading || !canSee}
                            isOwner={isMyAccount}
                            sharedCount={sharedFriendCount}
                        />
                    )}
                </div>
            )}

            <ProfileModals
                modal={shownModal}
                setModal={(next) => {
                    if (!next) doneEditing();
                    setModal(next);
                }}
                targetUser={targetUser}
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
