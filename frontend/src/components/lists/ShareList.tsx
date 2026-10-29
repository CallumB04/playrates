import { useState } from "react";
import { Share2 } from "lucide-react";
import type { GameListDetail } from "@playrates/shared";
import { listImageUrl } from "../../api";
import { listPath } from "../../lib/profilePaths";
import { cn } from "../../lib/cn";
import Button from "../ui/Button";
import ShareSheet from "../share/ShareSheet";
import { listImageFileName } from "./listImageFileName";

interface ShareListProps {
    list: GameListDetail;
    /** Whoever is looking, signed in; the link carries their invite. */
    viewerUsername?: string | null;
    className?: string;
}

/**
 * Share for a list anyone may see, with its picture. Not for any other, which
 * would open on nothing for most of the people the link reached, nor for an
 * empty one, which has nothing to show them.
 */
const ShareList = ({ list, viewerUsername, className }: ShareListProps) => {
    const [open, setOpen] = useState(false);
    if (list.visibility !== "everyone" || list.gameCount === 0) return null;

    const url = `${window.location.origin}${listPath(list.owner.username, list.id)}${
        viewerUsername ? `?ref=${encodeURIComponent(viewerUsername)}` : ""
    }`;

    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                onClick={() => setOpen(true)}
                className={cn("max-sm:min-h-11", className)}
            >
                <Share2 size={14} aria-hidden />
                Share
            </Button>
            {open && (
                <ShareSheet
                    title={list.name}
                    url={url}
                    text={`${list.name}, a list by ${list.owner.username} on PlayRates`}
                    imageUrl={listImageUrl(list.id, list.updatedAt)}
                    fileName={listImageFileName(list)}
                    noImage="Pictures are made only for lists on profiles everyone can see."
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
};

export default ShareList;
