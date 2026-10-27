import { useUserReviews } from "../../../hooks/queries/useReviews";
import { usePagination } from "../../../hooks/usePagination";
import { cardClass } from "../../../components/ui/Card";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ReviewRow from "./ReviewRow";
import ListFoot from "./ListFoot";
import { NoReviews } from "./ListEmpty";
import { usePageParam } from "../lib/usePageParam";

export const REVIEWS_PER_PAGE = 10;

interface ReviewListProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
}

/** Every review they have written, newest first. */
const ReviewList = ({ username, isOwner, canSee }: ReviewListProps) => {
    const [page, setPage] = usePageParam();
    const { data, isLoading } = useUserReviews(username, {
        page,
        limit: REVIEWS_PER_PAGE,
        enabled: canSee,
    });
    const reviews = data?.data ?? [];

    const pagination = usePagination({
        total: data?.meta.total ?? 0,
        perPage: REVIEWS_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    return (
        <>
            <div
                className={cardClass("flex flex-col gap-1 p-2", {
                    padding: "none",
                })}
            >
                {isLoading || !canSee ? (
                    <div className="px-2 py-3">
                        <TextSkeleton lines={8} />
                    </div>
                ) : reviews.length === 0 ? (
                    <NoReviews isOwner={isOwner} />
                ) : (
                    reviews.map((review) => (
                        <ReviewRow key={review.id} review={review} />
                    ))
                )}
            </div>
            <ListFoot pagination={pagination} />
        </>
    );
};

export default ReviewList;
