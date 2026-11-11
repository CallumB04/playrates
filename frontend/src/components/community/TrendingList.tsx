import type { TrendingThread } from "@playrates/shared";
import { cn } from "../../lib/cn";
import TrendingCard from "./TrendingCard";

/** Each place's colour, as the community page gives them. */
const TONE_FOR = ["brand", "info", "success"] as const;

/** The top few threads by messages this fortnight, ranked, each on its
 *  game's art. Three across only from desktop: on a tablet a third of the
 *  row was too narrow for a card. */
const TrendingList = ({
    threads,
    className,
}: {
    threads: TrendingThread[];
    className?: string;
}) => (
    <ol className={cn("grid gap-3 lg:grid-cols-3", className)}>
        {threads.map((thread, i) => (
            <li key={thread.id} className="min-w-0">
                <TrendingCard thread={thread} tone={TONE_FOR[i] ?? "success"} />
            </li>
        ))}
    </ol>
);

export default TrendingList;
