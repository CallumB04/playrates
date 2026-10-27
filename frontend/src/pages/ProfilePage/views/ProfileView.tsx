import { useState } from "react";
import type { AboutField, Profile, ProfileVisibility } from "@playrates/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import { useUpdateProfile } from "../../../hooks/queries/useProfiles";
import { useUserFavourites } from "../../../hooks/queries/useFavourites";
import AboutCard from "../components/AboutCard";
import FavouriteGames from "../components/FavouriteGames";
import FavouritesEditor from "../components/FavouritesEditor";

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
            <div className="lg:order-2">
                <ProfileAbout
                    profile={profile}
                    isOwner={isOwner}
                    onEditProfile={onEditProfile}
                />
            </div>
            <FavouriteGames
                username={profile.username}
                canSee={canSee}
                onEdit={isOwner ? () => setEditing(true) : undefined}
            />

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
