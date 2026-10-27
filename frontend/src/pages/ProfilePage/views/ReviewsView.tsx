import { useUserReviews } from "../../../hooks/queries/useReviews";
import { usePagination } from "../../../hooks/usePagination";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { formatCount } from "../../../lib/format";
import ReviewRow from "../components/ReviewRow";
import ListFoot from "../components/ListFoot";
import { NoReviews } from "../components/ListEmpty";
import { usePageParam } from "../lib/usePageParam";

export const REVIEWS_PER_PAGE = 10;

interface ReviewsViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
}

/** Every review they have written, newest first. */
const ReviewsView = ({ username, isOwner, canSee }: ReviewsViewProps) => {
    const [page, setPage] = usePageParam();
    const { data, isLoading } = useUserReviews(username, {
        page,
        limit: REVIEWS_PER_PAGE,
        enabled: canSee,
    });
    const reviews = data?.data ?? [];
    const total = data?.meta.total ?? 0;

    const pagination = usePagination({
        total,
        perPage: REVIEWS_PER_PAGE,
        page,
        onPageChange: setPage,
    });

    return (
        <section>
            <Panel
                title="Reviews"
                trailing={data && <PanelCount value={formatCount(total)} />}
                bodyClassName="flex flex-col gap-1 p-2"
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
            </Panel>
            <ListFoot pagination={pagination} />
        </section>
    );
};

export default ReviewsView;
