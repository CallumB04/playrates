import type { FriendEdge } from "@playrates/shared";
import FriendProfile from "../../../components/FriendProfile";
import LoadingSpinner from "../../../components/LoadingSpinner";

interface ProfileFriendsCardProps {
    /** Already filtered to accepted friendships. */
    friends: FriendEdge[];
    isLoading: boolean;
}

const ProfileFriendsCard = ({
    friends,
    isLoading,
}: ProfileFriendsCardProps) => (
    <div className="card relative h-3/5 w-full">
        <span className="flex items-center justify-between">
            <h2 className="card-header-text">Friends</h2>
            {friends.length > 0 && (
                <p className="text-center font-lexend font-light text-content-secondary">
                    <span>{friends.filter((f) => f.user.online).length}</span>/
                    <span>{friends.length}</span> Online
                </p>
            )}
        </span>

        {isLoading ? (
            <span className="absolute left-0 top-0 flex h-full w-full items-center justify-center">
                <LoadingSpinner size="lg" />
            </span>
        ) : (
            <div className="mt-2 flex max-h-[400px] flex-col gap-1 overflow-y-scroll">
                {friends.map((friend) => (
                    <FriendProfile
                        key={friend.user.id}
                        user={friend.user}
                        density="compact"
                    />
                ))}
            </div>
        )}
    </div>
);

export default ProfileFriendsCard;
