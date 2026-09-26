import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { ThreadCard as ThreadCardData } from "@playrates/shared";
import Button, { buttonClass } from "../../../components/ui/Button";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ThreadCard from "../../../components/community/ThreadCard";
import { formatCount } from "../../../lib/format";

interface GameThreadsProps {
    gameId: number;
    threads: ThreadCardData[];
    total: number;
    isLoading: boolean;
    /** Takes a signed-out visitor to log in first. */
    onStart: () => void;
}

/** Community threads about this game, a few at a time. */
const GameThreads = ({
    gameId,
    threads,
    total,
    isLoading,
    onStart,
}: GameThreadsProps) => (
    <section>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-3 border-b border-subtle pb-2.5">
            <h2 className="font-display text-section text-content">
                Community
            </h2>
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-label text-content-muted">
                    {formatCount(total)} {total === 1 ? "thread" : "threads"}
                </span>
                <Button
                    size="sm"
                    onClick={onStart}
                    className="min-h-11 sm:min-h-9"
                >
                    <Plus size={14} aria-hidden />
                    Start a thread
                </Button>
            </div>
        </div>

        {isLoading ? (
            <TextSkeleton lines={3} />
        ) : threads.length === 0 ? (
            <EmptyNote className="mt-3">
                No threads about this one yet. Start the first.
            </EmptyNote>
        ) : (
            <>
                <div className="-mx-3 flex flex-col">
                    {threads.map((thread) => (
                        <ThreadCard
                            key={thread.id}
                            thread={thread}
                            showSubject={false}
                        />
                    ))}
                </div>
                {total > threads.length && (
                    <Link
                        to={`/community?game=${gameId}`}
                        className={buttonClass(
                            "secondary",
                            "mt-2 w-full sm:w-auto",
                            "sm"
                        )}
                    >
                        See all {formatCount(total)} threads
                    </Link>
                )}
            </>
        )}
    </section>
);

export default GameThreads;
