import { ChevronDown, CircleCheck, Copy, ExternalLink } from "lucide-react";
import Button, { buttonClass } from "../../../components/ui/Button";
import { cardClass } from "../../../components/ui/Card";
import { useNotify } from "../../../contexts/NotificationContext";
import { cn } from "../../../lib/cn";
import AdminPageHeader from "../components/AdminPageHeader";
import {
    upNext,
    type TikTokPostRow,
    type TikTokSong,
} from "../lib/tiktokPosts";
import { TIKTOK_POSTS } from "./posts";

const CopyField = ({ label, value }: { label: string; value: string }) => {
    const notify = useNotify();
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            notify(`${label} copied`, "success");
        } catch {
            notify(`Couldn't copy the ${label.toLowerCase()}`, "error");
        }
    };
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-label text-content-muted">{label}</span>
                <Button
                    variant="secondary"
                    onClick={copy}
                    aria-label={`Copy ${label.toLowerCase()}`}
                >
                    <Copy size={14} aria-hidden />
                    Copy
                </Button>
            </div>
            <p className="rounded-sm bg-surface-sunken px-3 py-2.5 text-body-sm break-words whitespace-pre-wrap text-content">
                {value}
            </p>
        </div>
    );
};

const song = ({ track, artist }: TikTokSong) => `${track} — ${artist}`;

const Status = ({ row, next }: { row: TikTokPostRow; next: boolean }) => {
    const [text, tone] = row.posted
        ? [row.date ? `Posted ${row.date}` : "Posted", "text-success-content"]
        : !row.file
          ? ["No post file", "text-danger-content"]
          : !row.listed
            ? ["Not in POSTS.md", "text-warning-content"]
            : next
              ? ["Up next", "text-brand"]
              : ["Not posted", "text-content-muted"];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 text-label font-medium",
                tone
            )}
        >
            {row.posted && <CircleCheck size={14} aria-hidden />}
            {text}
        </span>
    );
};

const PostCard = ({ row, next }: { row: TikTokPostRow; next: boolean }) => {
    const post = row.file?.tiktok;
    return (
        <li
            className={cardClass("flex flex-col gap-4", {
                tone: next ? "accent" : "default",
            })}
        >
            <div className="flex flex-col gap-1.5">
                <Status row={row} next={next} />
                <h3 className="font-display text-section text-content">
                    {post?.title ?? row.name}
                </h3>
                <p className="text-label-sm text-content-muted">
                    {row.file && `${row.file.games.length} games · `}
                    <span className="font-mono">posts/{row.name}.json</span>
                </p>
            </div>

            {row.url && (
                <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClass(
                        "outline",
                        "w-full sm:w-auto sm:self-start"
                    )}
                >
                    View on TikTok
                    <ExternalLink size={14} aria-hidden />
                </a>
            )}

            {post && (
                // Open while there's posting to do; a posted one keeps its
                // copy a tap away without filling the page.
                <details open={!row.posted} className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-body-sm font-medium text-content-secondary hover:text-content sm:min-h-0 sm:py-1 [&::-webkit-details-marker]:hidden">
                        What to post with it
                        <ChevronDown
                            size={16}
                            aria-hidden
                            className="transition-transform group-open:rotate-180"
                        />
                    </summary>
                    <div className="mt-3 flex flex-col gap-4">
                        <CopyField label="Title" value={post.title} />
                        <CopyField
                            label="Description"
                            value={post.description}
                        />
                        <CopyField
                            label="Pinned comment"
                            value={post.pinnedComment}
                        />
                        <dl className="grid gap-3 text-body-sm sm:grid-cols-[max-content_1fr] sm:gap-x-6">
                            <dt className="text-label text-content-muted">
                                Sound
                            </dt>
                            <dd className="text-content">
                                {song(post.song)}
                                <span className="block text-content-muted">
                                    or {song(post.altSong)}
                                </span>
                            </dd>
                            <dt className="text-label text-content-muted">
                                When
                            </dt>
                            <dd className="text-content">{post.when}</dd>
                        </dl>
                    </div>
                </details>
            )}
        </li>
    );
};

/** The TikTok slideshows in marketing/tiktok, in posting order, with what's
 *  gone up and everything to paste in alongside the next one. */
const TikTokPage = () => {
    const posted = TIKTOK_POSTS.filter((row) => row.posted).length;
    const next = upNext(TIKTOK_POSTS);
    return (
        <>
            <AdminPageHeader
                title="TikTok"
                description={
                    <>
                        {posted} of {TIKTOK_POSTS.length} posted. Tick one off
                        in{" "}
                        <code className="font-mono text-[0.9em]">
                            marketing/tiktok/POSTS.md
                        </code>{" "}
                        once it’s live; this page catches up on the next deploy.
                    </>
                }
            />
            <ol className="flex flex-col gap-4">
                {TIKTOK_POSTS.map((row) => (
                    <PostCard key={row.name} row={row} next={row === next} />
                ))}
            </ol>
        </>
    );
};

export default TikTokPage;
