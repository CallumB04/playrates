import { useSearchParams } from "react-router-dom";
import { MessagesSquare, PenLine } from "lucide-react";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import { formatCount } from "../../../lib/format";
import ReviewList from "../components/ReviewList";
import ThreadList from "../components/ThreadList";

type PostKind = "reviews" | "threads";

interface PostsViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
    /** Undefined until each has loaded. */
    reviewCount: number | undefined;
    threadCount: number | undefined;
}

/** What they have written: reviews of games, and the threads they're in.
 *  One at a time, each paged on its own, as the shelves are. */
const PostsView = ({
    username,
    isOwner,
    canSee,
    reviewCount,
    threadCount,
}: PostsViewProps) => {
    const [params, setParams] = useSearchParams();
    const kind: PostKind =
        params.get("type") === "threads" ? "threads" : "reviews";

    const setKind = (next: PostKind) => {
        const updated = new URLSearchParams(params);
        updated.set("type", next);
        updated.delete("page"); // each list opens at its own first page
        setParams(updated);
    };

    return (
        <section className="flex flex-col gap-3">
            {/* Across a phone, as the shelves' switch is; its own width from sm. */}
            <div className="sm:self-start">
                <SegmentedChoice
                    label="Which posts to show"
                    segments={[
                        {
                            value: "reviews",
                            label: "Reviews",
                            icon: PenLine,
                            count:
                                reviewCount === undefined
                                    ? undefined
                                    : formatCount(reviewCount),
                        },
                        {
                            value: "threads",
                            label: "Threads",
                            icon: MessagesSquare,
                            count:
                                threadCount === undefined
                                    ? undefined
                                    : formatCount(threadCount),
                        },
                    ]}
                    value={kind}
                    onChange={setKind}
                    fill
                />
            </div>
            {kind === "reviews" ? (
                <ReviewList
                    username={username}
                    isOwner={isOwner}
                    canSee={canSee}
                />
            ) : (
                <ThreadList
                    username={username}
                    isOwner={isOwner}
                    canSee={canSee}
                />
            )}
        </section>
    );
};

export default PostsView;
