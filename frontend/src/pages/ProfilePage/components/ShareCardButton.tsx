import { useState } from "react";
import { Share2 } from "lucide-react";
import { playerCardUrl } from "../../../api";
import Button from "../../../components/ui/Button";
import ShareSheet from "../../../components/share/ShareSheet";
import { useProgress } from "../../../hooks/queries/useProgress";
import { profilePath } from "../../../lib/profilePaths";

/**
 * Your Player card, to post anywhere. Its link is your profile's, and it
 * counts anyone who joins from it as your invite, but it's a card to show
 * off rather than an invitation: that's Invite friends, which says what an
 * invite is worth.
 */
const ShareCardButton = ({ username }: { username: string }) => {
    const { data } = useProgress();
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                aria-label="Share your Player card"
                onClick={() => setOpen(true)}
                className="max-sm:size-11 max-sm:px-0"
            >
                <Share2 size={15} aria-hidden />
                <span className="hidden sm:inline">Share</span>
            </Button>
            {open && (
                <ShareSheet
                    title="Your Player card"
                    lede="Post it anywhere. Anyone who joins from its link counts as your invite."
                    url={`${window.location.origin}${profilePath(username)}?ref=${encodeURIComponent(username)}`}
                    text="My games on PlayRates"
                    imageUrl={playerCardUrl(username, data?.xp ?? 0)}
                    fileName={`${username}-playrates.png`}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
};

export default ShareCardButton;
