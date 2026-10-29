import { useId, useState, type ReactNode } from "react";
import { Check, Download, Link2, Share2 } from "lucide-react";
import {
    SiBluesky,
    SiFacebook,
    SiReddit,
    SiThreads,
    SiWhatsapp,
    SiX,
} from "@icons-pack/react-simple-icons";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { useNotify } from "../../contexts/NotificationContext";
import { shareLinks, type ShareTarget } from "../../lib/share";
import { cn } from "../../lib/cn";

interface ShareSheetProps {
    title: ReactNode;
    /** Under the title: "It's done", say. */
    lede?: ReactNode;
    /** The page's own address, as it should travel. */
    url: string;
    /** What a post says before the link. */
    text: string;
    /** The picture to post, which the sheet shows and hands over. */
    imageUrl: string;
    fileName: string;
    /** Said in the picture's place when there isn't one to be had. */
    noImage?: string;
    onClose: () => void;
}

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

const imageFile = async (imageUrl: string, fileName: string) => {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Image ${res.status}`);
    return new File([await res.blob()], fileName, { type: "image/png" });
};

/** A phone can hand a picture to Instagram, TikTok and the rest; most
 *  desktop browsers can share only a link, if that. */
const canShareFiles = () => {
    try {
        return (
            typeof navigator.canShare === "function" &&
            navigator.canShare({
                files: [new File([""], "probe.png", { type: "image/png" })],
            })
        );
    } catch {
        return false;
    }
};

/**
 * Everywhere a thing can be posted: the phone's own share sheet with the
 * picture where it can take one, a download for the apps that only take a
 * picture, the link, and each network's own post page.
 */
const ShareSheet = ({
    title,
    lede,
    url,
    text,
    imageUrl,
    fileName,
    noImage = "The picture couldn't be made just now.",
    onClose,
}: ShareSheetProps) => {
    const titleId = useId();
    const notify = useNotify();
    // Kept against its URL, so a newer picture starts loading afresh.
    const [settled, setSettled] = useState<{
        url: string;
        status: "loaded" | "missing";
    } | null>(null);
    const image = settled?.url === imageUrl ? settled.status : "loading";
    const setImage = (status: "loaded" | "missing") =>
        setSettled({ url: imageUrl, status });
    const hasImage = image !== "missing";
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const files = hasImage && canShareFiles();
    const native = typeof navigator.share === "function";

    const shareNative = async () => {
        setBusy(true);
        try {
            await navigator.share(
                files
                    ? {
                          files: [await imageFile(imageUrl, fileName)],
                          text: `${text} ${url}`,
                      }
                    : { title: text, text, url }
            );
        } catch (error) {
            // Closing the share sheet is a choice, not a failure.
            if ((error as Error).name !== "AbortError") {
                notify("Couldn't open sharing", "error");
            }
        } finally {
            setBusy(false);
        }
    };

    const download = async () => {
        setBusy(true);
        try {
            /* Fetched first: a download attribute on another origin's link
               is ignored, and the picture comes from the API's. */
            const file = await imageFile(imageUrl, fileName);
            const href = URL.createObjectURL(file);
            const a = document.createElement("a");
            a.href = href;
            a.download = fileName;
            a.click();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
        } catch {
            notify("Couldn't download the picture", "error");
        } finally {
            setBusy(false);
        }
    };

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
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-[420px]"
        >
            <h2
                id={titleId}
                className="pr-10 font-display text-section text-content"
            >
                {title}
            </h2>
            {lede && (
                <p className="mt-1 text-body-sm text-content-secondary">
                    {lede}
                </p>
            )}

            {/* The picture on a stage of its own, so it reads as the thing
                being shared rather than one more box in the popup. */}
            <div className="mt-4 grid place-items-center rounded-lg bg-linear-to-b from-brand-subtle to-surface-sunken/60 px-4 py-5">
                <div className="relative aspect-4/5 w-48 overflow-hidden rounded-md bg-surface-sunken shadow-lifted sm:w-56">
                    {image === "loading" && (
                        <Skeleton className="absolute inset-0" />
                    )}
                    {hasImage ? (
                        <img
                            src={imageUrl}
                            alt=""
                            onLoad={() => setImage("loaded")}
                            onError={() => setImage("missing")}
                            className={cn(
                                "size-full object-cover transition-opacity",
                                image === "loaded" ? "opacity-100" : "opacity-0"
                            )}
                        />
                    ) : (
                        <p className="grid size-full place-items-center p-4 text-center text-label-sm text-content-muted">
                            {noImage}
                        </p>
                    )}
                </div>
            </div>

            {hasImage && (
                <Button
                    size="touch"
                    onClick={() => void download()}
                    disabled={busy}
                    className="mt-4 w-full"
                >
                    <Download size={16} aria-hidden />
                    Download
                </Button>
            )}

            <div className="mt-2 flex min-h-12 items-center gap-2 rounded-sm border border-subtle bg-surface-sunken py-0.5 pr-0.5 pl-3 sm:py-1 sm:pr-1">
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

            <ul
                aria-label="Post it to"
                className="mt-4 flex justify-center gap-2.5 border-t border-subtle pt-4 pb-3 sm:gap-3 sm:pb-0"
            >
                {native && (
                    <li>
                        <button
                            type="button"
                            onClick={() => void shareNative()}
                            disabled={busy}
                            aria-label={files ? "Share the picture" : "Share"}
                            title={files ? "Share the picture" : "Share"}
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
        </Modal>
    );
};

export default ShareSheet;
