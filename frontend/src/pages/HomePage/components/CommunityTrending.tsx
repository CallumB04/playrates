import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { TRENDING_WINDOW_DAYS, type TrendingThread } from "@playrates/shared";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import TrendingList from "../../../components/community/TrendingList";

/** The three busiest community threads of the fortnight. */
const CommunityTrending = ({
    threads,
    isLoading,
}: {
    threads: TrendingThread[];
    isLoading: boolean;
}) => (
    <section>
        <header className="mb-4 flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-3">
                <h2 className="font-display text-section text-content">
                    Trending in community
                </h2>
                <span className="hidden text-label text-content-muted sm:inline">
                    most messages in the last {TRENDING_WINDOW_DAYS} days
                </span>
            </div>
            <Link
                to="/community"
                className="relative inline-flex shrink-0 items-center gap-0.5 text-label font-medium text-brand before:absolute before:-inset-3 before:content-[''] hover:underline"
            >
                See all
                <ChevronRight size={14} aria-hidden />
            </Link>
        </header>

        {isLoading ? (
            <TextSkeleton lines={3} />
        ) : threads.length === 0 ? (
            <EmptyNote>
                Nothing trending yet.{" "}
                <Link to="/community" className="text-brand hover:underline">
                    Start a thread
                </Link>{" "}
                and get it going.
            </EmptyNote>
        ) : (
            <TrendingList threads={threads} />
        )}
    </section>
);

export default CommunityTrending;
