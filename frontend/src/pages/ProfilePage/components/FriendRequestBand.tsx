import { Plus } from "lucide-react";
import type { Profile } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import ProfilePicture from "../../../components/ProfilePicture";

interface FriendRequestBandProps {
    profile: Pick<Profile, "username" | "avatarUrl" | "accent">;
    isPending: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

/**
 * A request from this member, answered here. Its own band rather than the
 * friend button's corner: there both words did not fit beside the avatar on a
 * phone, and the buttons alone did not say a request had come in.
 */
const FriendRequestBand = ({
    profile,
    isPending,
    onAccept,
    onDecline,
}: FriendRequestBandProps) => (
    <div className="mt-4 flex flex-col gap-3 rounded-md border border-brand/30 bg-brand-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-3 text-body-sm text-content">
            <span className="relative shrink-0">
                <ProfilePicture
                    variant="friendRow"
                    file={profile.avatarUrl ?? ""}
                    username={profile.username}
                    link={false}
                    accent={profile.accent}
                />
                <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-brand text-content-on-solid ring-2 ring-surface-raised">
                    <Plus size={12} strokeWidth={3} aria-hidden />
                </span>
            </span>
            <span>
                <span className="font-semibold">{profile.username}</span> sent
                you a friend request
            </span>
        </p>
        <div className="flex gap-2">
            <Button
                size="sm"
                className="max-sm:min-h-11 max-sm:flex-1"
                onClick={onAccept}
                disabled={isPending}
            >
                Accept
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="max-sm:min-h-11 max-sm:flex-1"
                onClick={onDecline}
                disabled={isPending}
            >
                Decline
            </Button>
        </div>
    </div>
);

export default FriendRequestBand;
