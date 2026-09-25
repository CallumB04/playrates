import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
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
import { useUrlSearchTerm } from "../../hooks/useUrlSearchTerm";
import { SearchInput } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { cardClass } from "../../components/ui/Card";
import EmptyPlate from "../../components/ui/EmptyPlate";
import Pagination from "../../components/ui/Pagination";
import SegmentedChoice from "../../components/ui/SegmentedChoice";
import { TextSkeleton } from "../../components/ui/Skeleton";
import ThreadCard from "../../components/community/ThreadCard";
import TrendingHero from "../../components/community/TrendingHero";
import TrendingRunnerUp from "../../components/community/TrendingRunnerUp";
import PatchNotesCard from "../../components/community/PatchNotesCard";
import FilterPill from "../../components/community/FilterPill";
import GameCover from "../../components/game/GameCover";
import ProfilePicture from "../../components/ProfilePicture";
import { useProfile } from "../../hooks/queries/useProfiles";
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
    const participant = params.get("user") || undefined;
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

    const {
        term,
        setTerm,
        value: q,
    } = useUrlSearchTerm("q", { alsoClear: ["page"] });

    const { data: threads, isLoading } = useThreads({
        gameId,
        participant,
        q,
        sort,
        page,
        limit: PER_PAGE,
    });
    // Three, not one: the same list the home page shows, from the same cache.
    const { data: trending } = useTrendingThreads(3);
    const { data: patchNotes } = usePatchNotes();
    const { data: game } = useGame(gameId);
    const { data: person } = useProfile(participant);

    const pagination = usePagination({
        total: threads?.meta.total ?? 0,
        perPage: PER_PAGE,
        page,
        onPageChange: (next) =>
            update({ page: next > 1 ? String(next) : null }),
    });

    const startThread = () =>
        user ? navigate(newThreadPath(gameId)) : openLogin();

    // Trending is site-wide, so it steps aside while the list is filtered.
    const filtered = !!gameId || !!participant || !!q;
    const [top, ...runnersUp] = !filtered ? (trending ?? []) : [];
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
                    {top && (
                        <div className="flex flex-col gap-3">
                            <TrendingHero thread={top} />
                            {runnersUp.length > 0 && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {runnersUp.map((thread, i) => (
                                        <TrendingRunnerUp
                                            key={thread.id}
                                            thread={thread}
                                            tone={i === 0 ? "info" : "success"}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <section className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h2 className="font-display text-section text-content">
                                    Threads
                                </h2>
                                {gameId && (
                                    <FilterPill
                                        leading={
                                            <GameCover
                                                coverUrl={
                                                    game?.coverUrl ?? null
                                                }
                                                title={game?.title ?? ""}
                                            />
                                        }
                                        label={game?.title ?? "One game"}
                                        to={`/game/${gameId}`}
                                        clearLabel={`Clear the ${game?.title ?? "game"} filter and show every thread`}
                                        onClear={() =>
                                            update({ game: null, page: null })
                                        }
                                    />
                                )}
                                {participant && (
                                    <FilterPill
                                        leading={
                                            <ProfilePicture
                                                variant="nav"
                                                file={person?.avatarUrl ?? ""}
                                                username={participant}
                                                accent={person?.accent}
                                                link={false}
                                            />
                                        }
                                        label={`${person?.username ?? participant}'s threads`}
                                        to={`/user/${encodeURIComponent(participant)}`}
                                        clearLabel={`Clear the ${participant} filter and show every thread`}
                                        onClear={() =>
                                            update({ user: null, page: null })
                                        }
                                    />
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

                        <div className="relative">
                            <Search
                                size={15}
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
                            />
                            <SearchInput
                                aria-label="Search threads"
                                placeholder="Search threads and messages"
                                value={term}
                                onChange={(event) =>
                                    setTerm(event.target.value)
                                }
                            />
                        </div>

                        {isLoading ? (
                            <TextSkeleton lines={8} />
                        ) : rows.length === 0 ? (
                            <EmptyPlate
                                title={q ? "No matches" : "No threads yet"}
                                body={
                                    q
                                        ? `Nothing matches "${q}". Try fewer or different words.`
                                        : participant
                                          ? "No threads from them yet."
                                          : gameId
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
