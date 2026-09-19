import { Link } from "react-router-dom";
import type { ReviewWithAuthor } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";

interface ProfileReviewsCardProps {
    reviews: ReviewWithAuthor[];
    /**
     * Cover art by game id. A review only carries a gameId, and the user's
     * logs already embed their game — so covers come from there rather than
     * from one request per review.
     */
    coversByGameId: Map<number, string>;
}

const ProfileReviewsCard = ({
    reviews,
    coversByGameId,
}: ProfileReviewsCardProps) => (
    <div className="card h-2/5 w-full">
        <h2 className="card-header-text">Reviews</h2>
        <div className="mt-2 flex h-[248px] flex-col gap-1 overflow-y-scroll">
            {reviews.map((review) => (
                <Link
                    key={review.id}
                    to={`/game/${review.gameId}`}
                    className="flex h-20 items-center gap-3 rounded-md p-2 transition-colors duration-200 hover:bg-surface-popup-to"
                >
                    <GameCover
                        coverUrl={coversByGameId.get(review.gameId) ?? null}
                        title=""
                        className="game-cover h-full object-cover"
                    />
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs text-content">
                            <p className="font-semibold tracking-wider">
                                {review.rating ?? "?"}/10
                            </p>
                            <i
                                className="fas fa-star text-brand"
                                aria-hidden="true"
                            ></i>
                        </span>
                        <p className="line-clamp-2 h-max text-sm text-content-secondary">
                            {review.body}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    </div>
);

export default ProfileReviewsCard;
