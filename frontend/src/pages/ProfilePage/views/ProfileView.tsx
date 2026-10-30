import { Fragment, useState } from "react";
import type { AboutField, Profile, ProfileVisibility } from "@playrates/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import { useUpdateProfile } from "../../../hooks/queries/useProfiles";
import { useUserFavourites } from "../../../hooks/queries/useFavourites";
import AboutCard from "../components/AboutCard";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import Gaming25Preview from "../../../components/gaming25/Gaming25Preview";
import LevelCard from "../../../components/progress/LevelCard";
import FavouriteGames from "../components/FavouriteGames";
import PinnedLists from "../components/PinnedLists";
import PinnedReviews from "../components/PinnedReviews";
import FavouritesEditor from "../components/FavouritesEditor";
import WishlistTop from "../components/WishlistTop";

interface ProfileViewProps {
    profile: Profile;
    isOwner: boolean;
    canSee: boolean;
    onEditProfile: () => void;
}

/** The About card on its own, owner's controls and all. Used past a hidden
 *  profile's card too, since each of its fields has a visibility of its own. */
export const ProfileAbout = ({
    profile,
    isOwner,
    onEditProfile,
}: Omit<ProfileViewProps, "canSee">) => {
    const { user } = useAuth();
    const notify = useNotify();
    const update = useUpdateProfile();

    const changeVisibility = (field: AboutField, value: ProfileVisibility) =>
        update.mutate(
            { aboutVisibility: { [field]: value } },
            {
                onError: () => notify("Couldn't change who sees that", "error"),
            }
        );

    return (
        <AboutCard
            profile={profile}
            owner={
                isOwner && user
                    ? {
                          visibility: user.aboutVisibility,
                          onChangeVisibility: changeVisibility,
                          onEdit: onEditProfile,
                          saving: update.isPending,
                      }
                    : undefined
            }
        />
    );
};

/** Who they are and what they love: the About card and their favourites. */
const ProfileView = ({
    profile,
    isOwner,
    canSee,
    onEditProfile,
}: ProfileViewProps) => {
    const [editing, setEditing] = useState(false);
    const { data: favourites } = useUserFavourites(profile.username, canSee);

    return (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            {/* First on a phone: who someone is comes before what they like. */}
            <div className="flex min-w-0 flex-col gap-4 lg:order-2 lg:gap-6">
                <LevelCard username={profile.username} isOwner={isOwner} />
                <Gaming25Preview
                    username={profile.username}
                    canSee={canSee}
                    isOwner={isOwner}
                />
                <ProfileAbout
                    profile={profile}
                    isOwner={isOwner}
                    onEditProfile={onEditProfile}
                />
            </div>
            {/* In the order its owner chose, in Edit profile. */}
            <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                {profile.sectionOrder.map((section) => (
                    <Fragment key={section}>
                        {section === "pinned_lists" && canSee && (
                            <PinnedLists
                                username={profile.username}
                                ids={profile.pinnedLists}
                                isOwner={isOwner}
                            />
                        )}
                        {section === "pinned_reviews" && canSee && (
                            <PinnedReviews
                                username={profile.username}
                                ids={profile.pinnedReviews}
                                isOwner={isOwner}
                            />
                        )}
                        {section === "favourites" && (
                            <FavouriteGames
                                username={profile.username}
                                canSee={canSee}
                                onEdit={
                                    isOwner ? () => setEditing(true) : undefined
                                }
                            />
                        )}
                        {section === "wishlist" && (
                            <WishlistTop
                                username={profile.username}
                                isMyAccount={isOwner}
                                canSee={canSee}
                            />
                        )}
                    </Fragment>
                ))}
                {/* Each card above hides itself by rules of its own, so this
                    shows only once every one of them has. */}
                <div className="hidden only:block">
                    <EmptyPlate
                        title="Nothing here yet"
                        body={`When ${profile.username} picks their favourite games, pins a list or review, or adds a game to their wishlist, it'll show here.`}
                    />
                </div>
            </div>

            {editing && (
                <FavouritesEditor
                    current={favourites ?? []}
                    onClose={() => setEditing(false)}
                />
            )}
        </div>
    );
};

export default ProfileView;
