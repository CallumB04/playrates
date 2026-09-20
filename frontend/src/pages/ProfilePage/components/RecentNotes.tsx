import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import type { ReviewWithAuthor } from "@playrates/shared";
import { fetchGameById, queryKeys } from "../../../api";
import { formatRating, relativeTime } from "../../../lib/format";

interface RecentNotesProps {
    reviews: ReviewWithAuthor[];
}

const SHOWN = 4;

/**
 * Reviews carry a gameId but no game, and the note's game is usually not on
 * whichever shelf tab happens to be open — so the titles are fetched for the
 * handful shown rather than read off the visible logs.
 */
const RecentNotes = ({ reviews }: RecentNotesProps) => {
    const shown = reviews.slice(0, SHOWN);

    const games = useQueries({
        queries: shown.map((review) => ({
            queryKey: queryKeys.games.byId(review.gameId),
            queryFn: () => fetchGameById(review.gameId),
            staleTime: 5 * 60_000,
        })),
    });

    return (
        <section>
            <h2 className="mb-3 font-mono text-label uppercase text-content-muted">
                Recent notes
            </h2>

            {shown.length === 0 ? (
                <p className="text-body-sm text-content-muted">
                    No notes written yet.
                </p>
            ) : (
                shown.map((review, i) => (
                    <article
                        key={review.id}
                        className="mb-3.5 border-b border-subtle pb-3.5"
                    >
                        <div className="flex flex-wrap items-baseline gap-2.5">
                            <Link
                                to={`/game/${review.gameId}`}
                                className="font-display text-lg text-content hover:text-brand"
                            >
                                {games[i]?.data?.title ?? "…"}
                            </Link>
                            <span className="font-mono text-[13px] font-semibold text-brand">
                                {formatRating(review.rating)}
                            </span>
                            <span className="font-mono text-label-sm uppercase text-content-muted">
                                {relativeTime(review.createdAt)}
                            </span>
                        </div>
                        <p className="mt-1.5 max-w-[66ch] text-sm leading-relaxed text-content-secondary">
                            {review.body}
                        </p>
                    </article>
                ))
            )}
        </section>
    );
};

export default RecentNotes;
