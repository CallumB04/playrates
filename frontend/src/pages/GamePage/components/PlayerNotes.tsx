import type { ReviewSort, ReviewWithAuthor } from "@playrates/shared";
import { Link } from "react-router-dom";
import ProfilePicture from "../../../components/ProfilePicture";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import Dropdown from "../../../components/ui/Dropdown";
import { formatCount, formatRating, relativeTime } from "../../../lib/format";

interface PlayerNotesProps {
    reviews: ReviewWithAuthor[];
    total: number;
    sort: ReviewSort;
    onSortChange: (sort: ReviewSort) => void;
    isLoading: boolean;
}

const PlayerNotes = ({
    reviews,
    total,
    sort,
    onSortChange,
    isLoading,
}: PlayerNotesProps) => (
    <section>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-3 border-b border-subtle pb-2.5">
            <h2 className="font-display text-section text-content">
                Player notes
            </h2>
            <div className="flex items-center gap-4">
                <span className="text-label text-content-muted">
                    {formatCount(total)} {total === 1 ? "entry" : "entries"}
                </span>
                <Dropdown
                    options={[
                        { value: "recent", label: "Most recent" },
                        { value: "oldest", label: "Oldest first" },
                        { value: "rating-high", label: "Highest rated" },
                        { value: "rating-low", label: "Lowest rated" },
                    ]}
                    value={sort}
                    onChange={(next) => onSortChange(next as ReviewSort)}
                    aria-label="Sort notes"
                    className="w-40"
                />
            </div>
        </div>

        {isLoading ? (
            <TextSkeleton lines={4} />
        ) : reviews.length === 0 ? (
            <EmptyPlate
                title="No notes yet"
                body="Log this game and leave a note. Someone deciding whether to start it will read it."
            />
        ) : (
            reviews.map((review) => (
                <article
                    key={review.id}
                    className="grid grid-cols-[38px_minmax(0,1fr)_64px] gap-4 border-b border-subtle py-4"
                >
                    <ProfilePicture
                        variant="friendRow"
                        file={review.author.avatarUrl ?? ""}
                        username={review.author.username}
                        link={false}
                    />
                    <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-baseline gap-2.5">
                            <Link
                                to={`/user/${review.author.username}`}
                                className="text-body-sm font-semibold text-content hover:text-brand"
                            >
                                {review.author.username}
                            </Link>
                            <span className="text-label-sm text-content-muted">
                                {relativeTime(review.createdAt)}
                            </span>
                        </div>
                        <p className="max-w-[46ch] text-sm leading-relaxed text-content-secondary">
                            {review.body}
                        </p>
                    </div>
                    <span className="text-right font-mono text-figure-lg text-brand">
                        {formatRating(review.rating)}
                    </span>
                </article>
            ))
        )}
    </section>
);

export default PlayerNotes;
