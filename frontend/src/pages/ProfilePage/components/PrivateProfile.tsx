import { Link } from "react-router-dom";
import { Lock, Users } from "lucide-react";
import type { FriendRelation, ProfileVisibility } from "@playrates/shared";
import EmptyPlate from "../../../components/ui/EmptyPlate";

interface PrivateProfileProps {
    username: string;
    visibility: Exclude<ProfileVisibility, "everyone">;
    signedIn: boolean;
    relation: FriendRelation | null;
}

/** Everything under the profile card, when none of it is this viewer's. */
export const PrivateProfile = ({
    username,
    visibility,
    signedIn,
    relation,
}: PrivateProfileProps) => {
    if (visibility === "private") {
        return (
            <EmptyPlate
                title={`${username}'s profile is private`}
                body="Their games, reviews and friends are only visible to them."
            />
        );
    }

    const body = !signedIn
        ? "Sign in and add them as a friend to see their games, reviews and friends."
        : relation === "request-sent"
          ? "You've sent a friend request. Their profile opens up once they accept."
          : relation === "request-received"
            ? "Accept their friend request to see their games, reviews and friends."
            : "Add them as a friend to see their games, reviews and friends.";

    return (
        <EmptyPlate
            title={`Only ${username}'s friends can see their profile`}
            body={body}
        />
    );
};

/** On your own profile, so a hidden one is never a surprise. */
export const OwnProfileVisibility = ({
    visibility,
}: {
    visibility: Exclude<ProfileVisibility, "everyone">;
}) => {
    const Icon = visibility === "private" ? Lock : Users;
    return (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-content-secondary">
            <Icon size={14} aria-hidden className="shrink-0" />
            {visibility === "private"
                ? "Only you can see your profile."
                : "Only your friends can see your profile."}
            <Link
                to="/settings?section=profile"
                className="relative font-medium text-brand underline-offset-2 before:absolute before:-inset-3 before:content-[''] hover:underline"
            >
                Change
            </Link>
        </p>
    );
};
