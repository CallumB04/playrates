import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import {
    SiBluesky,
    SiFacebook,
    SiReddit,
    SiThreads,
    SiWhatsapp,
    SiX,
} from "@icons-pack/react-simple-icons";
import Button from "../ui/Button";
import { useNotify } from "../../contexts/NotificationContext";
import { shareLinks, type ShareTarget } from "../../lib/share";
import { cn } from "../../lib/cn";

const NETWORK_ICONS: Record<ShareTarget, typeof SiX> = {
    x: SiX,
    bluesky: SiBluesky,
    threads: SiThreads,
    reddit: SiReddit,
    whatsapp: SiWhatsapp,
    facebook: SiFacebook,
};

// 40px to the eye, 44px to a thumb: seven fit a phone's row with room
// between them.
const ICON =
    "relative grid size-10 cursor-pointer place-items-center rounded-full bg-surface-sunken text-content-secondary lift " +
    "before:absolute before:-inset-0.5 before:content-[''] " +
    "hover:-translate-y-px hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-60 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** A link as it reads, with a button that copies it. */
export const CopyLink = ({
    url,
    className,
}: {
    url: string;
    className?: string;
}) => {
    const notify = useNotify();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            notify("Couldn't copy the link", "error");
        }
    };
    // The address as it reads, not as it's typed: no scheme, no slash.
    const shownUrl = url.replace(/^https?:\/\//, "");

    return (
        <div
            className={cn(
                "flex min-h-12 items-center gap-2 rounded-sm border border-subtle bg-surface-sunken py-0.5 pr-0.5 pl-3 sm:py-1 sm:pr-1",
                className
            )}
        >
            <Link2
                size={15}
                aria-hidden
                className="shrink-0 text-content-muted"
            />
            <span className="min-w-0 flex-1 truncate font-mono text-label-sm text-content-secondary">
                {shownUrl}
            </span>
            <Button
                variant="secondary"
                size="sm"
                onClick={() => void copy()}
                className="min-h-11 shrink-0 sm:min-h-10"
            >
                {copied && <Check size={14} aria-hidden />}
                {copied ? "Copied" : "Copy"}
            </Button>
        </div>
    );
};

/**
 * The phone's own share sheet where there is one, and each network's post
 * page. `onNative` replaces the plain link share, for one that hands over a
 * picture too.
 */
export const ShareTargets = ({
    url,
    text,
    onNative,
    nativeLabel = "Share",
    busy = false,
    className,
}: {
    url: string;
    text: string;
    onNative?: () => void;
    nativeLabel?: string;
    busy?: boolean;
    className?: string;
}) => {
    const notify = useNotify();
    const native = typeof navigator.share === "function";
    const shareLink = async () => {
        try {
            await navigator.share({ title: text, text, url });
        } catch (error) {
            // Closing the share sheet is a choice, not a failure.
            if ((error as Error).name !== "AbortError") {
                notify("Couldn't open sharing", "error");
            }
        }
    };

    return (
        <ul
            aria-label="Post it to"
            className={cn("flex justify-center gap-2.5 sm:gap-3", className)}
        >
            {native && (
                <li>
                    <button
                        type="button"
                        onClick={onNative ?? (() => void shareLink())}
                        disabled={busy}
                        aria-label={nativeLabel}
                        title={nativeLabel}
                        className={ICON}
                    >
                        <Share2 size={18} aria-hidden />
                    </button>
                </li>
            )}
            {shareLinks(url, text).map((link) => {
                const Icon = NETWORK_ICONS[link.target];
                return (
                    <li key={link.target}>
                        <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={link.label}
                            title={link.label}
                            className={ICON}
                        >
                            <Icon size={18} aria-hidden />
                        </a>
                    </li>
                );
            })}
        </ul>
    );
};
