import { Link } from "react-router-dom";
import type { ReviewWithAuthor } from "@playrates/shared";
import Panel, { panelButtonClass } from "../../../components/ui/Panel";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { postsPath } from "../../../lib/profilePaths";
import { formatCount } from "../../../lib/format";
import ReviewRow from "./ReviewRow";
import { NoReviews } from "./ListEmpty";

interface RecentReviewsProps {
    username: string;
    reviews: ReviewWithAuthor[];
    /** Every review they have written, for the "See all" count. */
    total: number;
    isLoading: boolean;
    /** Own profile gets a prompt to write one; a visitor does not. */
    isOwner: boolean;
}

const SHOWN = 3;

/** Somebody's last few reviews; the rest are on their posts view. */
const RecentReviews = ({
    username,
    reviews,
    total,
    isLoading,
    isOwner,
}: RecentReviewsProps) => {
    const shown = reviews.slice(0, SHOWN);

    return (
        <Panel title="Recent reviews" bodyClassName="flex flex-col gap-1 p-2">
            {/* An unfetched list is not an empty one, so it does not get the
                empty state's sentence. */}
            {isLoading ? (
                <div className="px-2 py-3">
                    <TextSkeleton lines={5} />
                </div>
            ) : shown.length === 0 ? (
                <NoReviews isOwner={isOwner} />
            ) : (
                <>
                    {shown.map((review) => (
                        <ReviewRow key={review.id} review={review} />
                    ))}
                    {total > shown.length && (
                        <div className="flex pt-1">
                            <Link
                                to={postsPath(username, "reviews")}
                                className={panelButtonClass()}
                            >
                                See all {formatCount(total)}
                            </Link>
                        </div>
                    )}
                </>
            )}
        </Panel>
    );
};

export default RecentReviews;
