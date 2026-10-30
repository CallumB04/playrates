import { useId, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { useNotify } from "../../contexts/NotificationContext";
import { CopyLink, ShareTargets } from "./ShareParts";
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
    const [busy, setBusy] = useState(false);
    const files = hasImage && canShareFiles();

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

            <CopyLink url={url} className="mt-2" />

            <ShareTargets
                url={url}
                text={text}
                onNative={() => void shareNative()}
                nativeLabel={files ? "Share the picture" : "Share"}
                busy={busy}
                className="mt-4 border-t border-subtle pt-4 pb-3 sm:pb-0"
            />
        </Modal>
    );
};

export default ShareSheet;
