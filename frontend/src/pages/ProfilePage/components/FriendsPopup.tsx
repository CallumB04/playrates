import { UserAccount } from "../../../api";
import ClosePopupIcon from "../../../components/ClosePopupIcon";
import FriendProfile from "../../../components/FriendProfile";

interface FriendsPopupProps {
    closePopup: () => void;
    friends?: UserAccount[];
    friendsLoading?: boolean;
    friendsError: Error | null;
}

const FriendsPopup: React.FC<FriendsPopupProps> = ({ closePopup, friends }) => {
    return (
        <dialog className="popup-backdrop" onMouseDown={closePopup}>
            <div
                className="popup popup-default flex w-full max-w-[550px] flex-col gap-3 text-center"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2 className="text-xl text-content">Friends</h2>
                <div className="flex max-h-96 w-full flex-col gap-2 overflow-y-scroll border-t border-t-subtle pt-3">
                    {friends && friends?.length > 0 ? (
                        friends?.map((friend) => {
                            return (
                                <FriendProfile
                                    key={friend.id}
                                    user={friend}
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
                            {friends?.filter((friend) => friend.online).length}
                        </span>
                        /<span>{friends?.length}</span> Online
                    </p>
                ) : (
                    <></>
                )}

                <ClosePopupIcon onClick={closePopup} />
            </div>
        </dialog>
    );
};

export default FriendsPopup;
