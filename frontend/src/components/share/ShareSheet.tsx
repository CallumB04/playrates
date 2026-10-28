import { useId, useState, type ReactNode } from "react";
import { Check, Download, Link2, Share2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { useNotify } from "../../contexts/NotificationContext";
import { shareLinks } from "../../lib/share";
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

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-[560px]"
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

            <div className="mt-4 grid gap-4 sm:grid-cols-[176px_minmax(0,1fr)]">
                <div className="relative mx-auto aspect-4/5 w-40 overflow-hidden rounded-sm bg-surface-sunken shadow-plate sm:w-full">
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
                        <p className="grid size-full place-items-center p-3 text-center text-label-sm text-content-muted">
                            {noImage}
                        </p>
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                    {native && (
                        <Button
                            size="touch"
                            onClick={() => void shareNative()}
                            disabled={busy}
                            className="w-full"
                        >
                            <Share2 size={16} aria-hidden />
                            {files ? "Share the picture" : "Share"}
                        </Button>
                    )}
                    {hasImage && (
                        <Button
                            variant={native ? "secondary" : "primary"}
                            size="touch"
                            onClick={() => void download()}
                            disabled={busy}
                            className="w-full"
                        >
                            <Download size={16} aria-hidden />
                            Download the picture
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="touch"
                        onClick={() => void copy()}
                        className="w-full"
                    >
                        {copied ? (
                            <Check size={16} aria-hidden />
                        ) : (
                            <Link2 size={16} aria-hidden />
                        )}
                        {copied ? "Link copied" : "Copy the link"}
                    </Button>
                    {hasImage && (
                        <p className="text-label-sm text-content-muted">
                            For Instagram and TikTok, post the picture.
                        </p>
                    )}
                </div>
            </div>

            <ul
                aria-label="Post it to"
                className="mt-4 grid grid-cols-2 gap-2 border-t border-subtle pt-4 sm:grid-cols-3"
            >
                {shareLinks(url, text).map((link) => (
                    <li key={link.target}>
                        <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-11 items-center justify-center rounded-sm border border-subtle bg-surface-raised px-3 text-body-sm font-medium text-content lift hover:border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </Modal>
    );
};

export default ShareSheet;
