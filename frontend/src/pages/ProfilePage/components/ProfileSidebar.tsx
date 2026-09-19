import type { FriendRelation, Profile } from "@playrates/shared";
import ProfilePicture from "../../../components/ProfilePicture";
import UserStatus from "../../../components/UserStatus";
import {
    getUserRelationColors,
    getUserRelationIcon,
    getUserRelationText,
} from "../lib/friendRelation";

interface ProfileSidebarProps {
    targetUser: Profile;
    isMyAccount: boolean;
    isSignedIn: boolean;
    userRelation: FriendRelation | null;
    /** True below lg, where labels shorten and the mobile actions appear. */
    isCompact: boolean;
    isHoveringProfileButton: boolean;
    onHoverProfileButton: (hovering: boolean) => void;
    /** Edit profile when it is your own page, otherwise the friend action. */
    onPrimaryAction: () => void;
    onDeclineRequest: () => void;
    /** Prompts sign-in when a signed-out visitor uses an action. */
    onRequireSignIn: () => void;
    onOpenFriends: () => void;
    onOpenEditProfile: () => void;
    onRemoveFriend: () => void;
}

/**
 * The left column: avatar, identity, and whichever relationship action
 * applies. Mobile renders the same actions as a separate row, which is why
 * `isCompact` is passed in rather than read from a hook here — the page
 * already knows the width and there is no reason to measure it twice.
 */
const ProfileSidebar = ({
    targetUser,
    isMyAccount,
    isSignedIn,
    userRelation,
    isCompact,
    isHoveringProfileButton,
    onHoverProfileButton,
    onPrimaryAction,
    onDeclineRequest,
    onRequireSignIn,
    onOpenFriends,
    onOpenEditProfile,
    onRemoveFriend,
}: ProfileSidebarProps) => (
    <>
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
                        status={targetUser.online ? "online" : "offline"}
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
                        {isSignedIn ? (
                            <button
                                className={`button-outline flex w-full items-center justify-center gap-4 ${isMyAccount ? "border-content text-content hover:border-brand hover:text-brand-hover" : getUserRelationColors(userRelation)}`}
                                onMouseOver={() => onHoverProfileButton(true)}
                                onMouseOut={() => onHoverProfileButton(false)}
                                onClick={onPrimaryAction}
                            >
                                <p className="text-lg">
                                    {isMyAccount
                                        ? "Edit Profile"
                                        : getUserRelationText(
                                              userRelation,
                                              isHoveringProfileButton,
                                              isCompact
                                          )}
                                </p>
                                <i
                                    className={`fas text-lg fa-${
                                        isMyAccount
                                            ? "pen"
                                            : getUserRelationIcon(userRelation)
                                    }`}
                                />
                            </button>
                        ) : (
                            <button
                                className="button-outline flex items-center justify-center gap-4 text-lg text-content hover:cursor-pointer hover:border-brand hover:text-brand"
                                onClick={onRequireSignIn}
                            >
                                <p>Login to add</p>
                                <i className="fas fa-right-to-bracket"></i>
                            </button>
                        )}

                        {userRelation === "request-received" ? (
                            <button
                                className="button-outline flex w-full items-center justify-center gap-4 border-danger text-lg text-danger-soft hover:border-danger-strong hover:text-danger"
                                onClick={onDeclineRequest}
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
                    onClick={() => onOpenFriends()}
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
                        onClick={() => onOpenEditProfile()}
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
                {/* Remove friend (mobile). Calls the remove action directly
                    rather than the generic primary action, which happens to
                    do the same thing only while the relation is "friend". */}
                {userRelation === "friend" ? (
                    <i
                        className={`fas fa-${getUserRelationIcon(userRelation)} text-2xl text-content transition-colors duration-200 hover:cursor-pointer hover:text-brand lg:hidden lg:text-[22px]`}
                        title="Remove friend"
                        onClick={onRemoveFriend}
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
                {isSignedIn ? (
                    <div className="flex w-full gap-4">
                        <button
                            className={`button-outline flex ${userRelation === "request-received" ? "w-1/2" : "w-full"} items-center justify-center gap-4 text-lg ${getUserRelationColors(userRelation)}`}
                            onClick={onPrimaryAction}
                        >
                            <p>
                                {getUserRelationText(
                                    userRelation,
                                    isHoveringProfileButton,
                                    isCompact
                                )}
                            </p>
                            <i
                                className={`fas fa-${getUserRelationIcon(userRelation)}`}
                            />
                        </button>
                        {userRelation === "request-received" ? (
                            <button
                                className="button-outline flex w-1/2 items-center justify-center gap-4 border-danger text-lg text-danger-soft hover:border-danger-strong hover:text-danger"
                                onClick={onDeclineRequest}
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
                        onClick={onRequireSignIn}
                    >
                        <p>Login to add</p>
                        <i className="fas fa-right-to-bracket"></i>
                    </button>
                )}
            </div>
        ) : (
            <></>
        )}
    </>
);

export default ProfileSidebar;
