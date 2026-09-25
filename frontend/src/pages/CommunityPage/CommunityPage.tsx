import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import type { ThreadSort } from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import {
    usePatchNotes,
    useThreads,
    useTrendingThreads,
} from "../../hooks/queries/useCommunity";
import { useGame } from "../../hooks/queries/useGames";
import { usePagination } from "../../hooks/usePagination";
import { usePageTitle } from "../../hooks/usePageTitle";
import Button from "../../components/ui/Button";
import { cardClass } from "../../components/ui/Card";
import Chip from "../../components/ui/Chip";
import EmptyPlate from "../../components/ui/EmptyPlate";
import Pagination from "../../components/ui/Pagination";
import SegmentedChoice from "../../components/ui/SegmentedChoice";
import { TextSkeleton } from "../../components/ui/Skeleton";
import ThreadCard from "../../components/community/ThreadCard";
import TrendingHero from "../../components/community/TrendingHero";
import PatchNotesCard from "../../components/community/PatchNotesCard";
import { newThreadPath } from "../../components/community/paths";

const PER_PAGE = 20;

const SORTS: { value: ThreadSort; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "new", label: "New" },
];

const CommunityPage = () => {
    usePageTitle("Community");
    const navigate = useNavigate();
    const { user } = useAuth();
    const { openLogin } = useAccountForm();

    const [params, setParams] = useSearchParams();
    const gameId = Number(params.get("game")) || undefined;
    const sort: ThreadSort = params.get("sort") === "new" ? "new" : "active";
    const page = Math.max(1, Number(params.get("page")) || 1);

    const update = (next: Record<string, string | null>) =>
        setParams(
            (current) => {
                const merged = new URLSearchParams(current);
                for (const [key, value] of Object.entries(next)) {
                    if (value === null) merged.delete(key);
                    else merged.set(key, value);
                }
                return merged;
            },
            { replace: true }
        );

    const { data: threads, isLoading } = useThreads({
        gameId,
        sort,
        page,
        limit: PER_PAGE,
    });
    // Three, not one: the same list the home page shows, from the same cache.
    const { data: trending } = useTrendingThreads(3);
    const { data: patchNotes } = usePatchNotes();
    const { data: game } = useGame(gameId);

    const pagination = usePagination({
        total: threads?.meta.total ?? 0,
        perPage: PER_PAGE,
        page,
        onPageChange: (next) =>
            update({ page: next > 1 ? String(next) : null }),
    });

    const startThread = () =>
        user ? navigate(newThreadPath(gameId)) : openLogin();

    const top = !gameId ? trending?.[0] : undefined;
    const rows = threads?.data ?? [];

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-title text-content">
                        Community
                    </h1>
                    <p className="mt-2 max-w-[56ch] text-body text-content-secondary">
                        Threads about the games people here are playing.
                    </p>
                </div>
                <Button onClick={startThread} className="w-full sm:w-auto">
                    <Plus size={16} aria-hidden />
                    Start a thread
                </Button>
            </header>

            {patchNotes && (
                <PatchNotesCard
                    summary={patchNotes}
                    variant="banner"
                    className="lg:hidden"
                />
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-6">
                    {top && <TrendingHero thread={top} />}

                    <section className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h2 className="font-display text-section text-content">
                                    Threads
                                </h2>
                                {gameId && (
                                    <Chip
                                        selected
                                        onClick={() =>
                                            update({ game: null, page: null })
                                        }
                                        aria-label={`Showing ${game?.title ?? "one game"} only. Show every game`}
                                        className="max-w-full"
                                    >
                                        <span className="truncate">
                                            {game?.title ?? "One game"}
                                        </span>
                                        <X size={13} aria-hidden />
                                    </Chip>
                                )}
                            </div>
                            <SegmentedChoice
                                segments={SORTS}
                                value={sort}
                                onChange={(next) =>
                                    update({
                                        sort: next === "new" ? "new" : null,
                                        page: null,
                                    })
                                }
                                label="Sort threads"
                            />
                        </div>

                        {isLoading ? (
                            <TextSkeleton lines={8} />
                        ) : rows.length === 0 ? (
                            <EmptyPlate
                                title="No threads yet"
                                body={
                                    gameId
                                        ? "Nobody has started one about this game. Be the first."
                                        : "Start the first one: pick a game and say what's on your mind."
                                }
                                action={
                                    <Button onClick={startThread}>
                                        Start a thread
                                    </Button>
                                }
                            />
                        ) : (
                            <div
                                className={cardClass(
                                    "divide-y divide-subtle overflow-hidden p-1",
                                    { padding: "none" }
                                )}
                            >
                                {rows.map((thread) => (
                                    <ThreadCard
                                        key={thread.id}
                                        thread={thread}
                                    />
                                ))}
                            </div>
                        )}

                        <Pagination
                            pagination={pagination}
                            onChange={() => window.scrollTo({ top: 0 })}
                        />
                    </section>
                </div>

                {patchNotes && (
                    <aside className="hidden lg:sticky lg:top-24 lg:block">
                        <PatchNotesCard summary={patchNotes} variant="aside" />
                    </aside>
                )}
            </div>
        </div>
    );
};

export default CommunityPage;
