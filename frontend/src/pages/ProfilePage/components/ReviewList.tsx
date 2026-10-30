import { useUserReviews } from "../../../hooks/queries/useReviews";
import { usePagination } from "../../../hooks/usePagination";
import { cardClass } from "../../../components/ui/Card";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { ItemSheetFor } from "../../../components/shop/ItemSheet";
import ReviewRow from "./ReviewRow";
import { usePinReviews } from "../lib/usePinReviews";
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
    const pins = usePinReviews();

    const pagination = usePagination({
        total: data?.meta.total ?? 0,
        perPage: REVIEWS_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    if (!isLoading && canSee && reviews.length === 0)
        return <NoReviews isOwner={isOwner} />;

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
                ) : (
                    reviews.map((review) => (
                        <ReviewRow
                            key={review.id}
                            review={review}
                            pin={
                                isOwner
                                    ? {
                                          on: pins.pinned.includes(review.id),
                                          toggle: () => pins.toggle(review.id),
                                      }
                                    : undefined
                            }
                        />
                    ))
                )}
            </div>
            <ListFoot pagination={pagination} />
            {pins.buying && <ItemSheetFor {...pins.buying} />}
        </>
    );
};

export default ReviewList;
