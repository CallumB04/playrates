import { Link } from "react-router-dom";
import { Lock, Users } from "lucide-react";
import type { FriendRelation, GamesVisibility } from "@playrates/shared";
import EmptyPlate from "../../../components/ui/EmptyPlate";

interface PrivateShelfProps {
    username: string;
    visibility: Exclude<GamesVisibility, "everyone">;
    signedIn: boolean;
    relation: FriendRelation | null;
}

/** In place of the shelves, when they are not this viewer's to see. */
export const PrivateShelf = ({
    username,
    visibility,
    signedIn,
    relation,
}: PrivateShelfProps) => {
    if (visibility === "private") {
        return (
            <EmptyPlate
                title={`${username}'s games are private`}
                body="Only they can see what they've logged."
            />
        );
    }

    const body = !signedIn
        ? "Sign in and add them as a friend to see them."
        : relation === "request-sent"
          ? "You've sent a friend request. Their games show here once they accept."
          : relation === "request-received"
            ? "Accept their friend request to see them."
            : "Add them as a friend to see them.";

    return (
        <EmptyPlate
            title={`Only ${username}'s friends can see their games`}
            body={body}
        />
    );
};

/** On your own profile, so a hidden shelf is never a surprise. */
export const OwnShelfVisibility = ({
    visibility,
}: {
    visibility: Exclude<GamesVisibility, "everyone">;
}) => {
    const Icon = visibility === "private" ? Lock : Users;
    return (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-content-secondary">
            <Icon size={14} aria-hidden className="shrink-0" />
            {visibility === "private"
                ? "Only you can see your games."
                : "Only your friends can see your games."}
            <Link
                to="/settings?section=profile"
                className="relative font-medium text-brand underline-offset-2 before:absolute before:-inset-3 before:content-[''] hover:underline"
            >
                Change
            </Link>
        </p>
    );
};
