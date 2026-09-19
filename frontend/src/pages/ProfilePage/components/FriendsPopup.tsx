import type { FriendEdge } from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
import FriendProfile from "../../../components/FriendProfile";

interface FriendsPopupProps {
    closePopup: () => void;
    friends?: FriendEdge[];
    friendsLoading?: boolean;
}

const FriendsPopup: React.FC<FriendsPopupProps> = ({ closePopup, friends }) => {
    return (
        <Modal
            onClose={closePopup}
            className="flex w-full max-w-[550px] flex-col gap-3 text-center"
        >
            <div className="contents">
                <h2 className="text-xl text-content">Friends</h2>
                <div className="flex max-h-96 w-full flex-col gap-2 overflow-y-scroll border-t border-t-subtle pt-3">
                    {friends && friends?.length > 0 ? (
                        friends?.map((friend) => {
                            return (
                                <FriendProfile
                                    key={friend.user.id}
                                    user={friend.user}
                                    closePopup={closePopup}
                                    density="comfortable"
                                />
                            );
                        })
                    ) : (
                        <p className="text-content-secondary">
                            This user currently has no friends.
                        </p>
                    )}
                </div>

                {friends && friends?.length > 0 ? (
                    <p className="mt-2 text-center font-light text-content-secondary">
                        <span>
                            {
                                friends?.filter((friend) => friend.user.online)
                                    .length
                            }
                        </span>
                        /<span>{friends?.length}</span> Online
                    </p>
                ) : (
                    <></>
                )}
            </div>
        </Modal>
    );
};

export default FriendsPopup;
