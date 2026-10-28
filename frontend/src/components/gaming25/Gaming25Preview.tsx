import { Link } from "react-router-dom";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { GAMING_25_CENTRE, GAMING_25_SIZE } from "@playrates/shared";
import Panel from "../ui/Panel";
import { buttonClass } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { useGaming25 } from "../../hooks/queries/useGaming25";
import { formatCount } from "../../lib/format";
import { gaming25Path } from "../../lib/profilePaths";
import Gaming25Grid from "./Gaming25Grid";

interface Gaming25PreviewProps {
    username: string;
    canSee: boolean;
    isOwner: boolean;
}

/**
 * Someone's Gaming 25 in small on their profile, the whole of it one way
 * into the full page. Their own, not yet begun, is an invitation instead;
 * a visitor sees nothing of one that hasn't been.
 */
const Gaming25Preview = ({
    username,
    canSee,
    isOwner,
}: Gaming25PreviewProps) => {
    const { data: grid, isLoading } = useGaming25(username, canSee);
    const path = gaming25Path(username);

    if (!canSee) return null;
    if (isLoading) return <Skeleton className="h-56 rounded-lg" />;
    const count = grid?.picks.length ?? 0;

    if (count === 0) {
        if (!isOwner) return null;
        return (
            <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-brand/40 bg-brand-subtle p-4 sm:flex-row sm:items-center sm:p-5">
                <Sparkles
                    size={22}
                    aria-hidden
                    className="shrink-0 text-brand"
                />
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base font-semibold text-content">
                        Make your Gaming 25
                    </h2>
                    <p className="text-body-sm text-content-secondary">
                        25 categories, one game each. Then share it and see who
                        agrees.
                    </p>
                </div>
                <Link
                    to={path}
                    className={buttonClass(
                        "primary",
                        "w-full sm:w-auto",
                        "touch"
                    )}
                >
                    Start yours
                </Link>
            </section>
        );
    }

    const centre = grid?.picks.find((p) => p.category === GAMING_25_CENTRE);

    return (
        <Panel
            title="Gaming 25"
            trailing={
                <span
                    className="inline-flex items-center gap-1 font-mono text-label-sm text-content-muted"
                    aria-label={`${formatCount(grid?.loveCount ?? 0)} loves`}
                >
                    <Heart
                        size={13}
                        aria-hidden
                        className="fill-love text-love"
                    />
                    {formatCount(grid?.loveCount ?? 0)}
                </span>
            }
        >
            <Link
                to={path}
                className="group flex flex-col gap-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:flex-row sm:items-center"
            >
                <Gaming25Grid
                    picks={grid?.picks ?? []}
                    compact
                    className="w-full max-w-64 self-center transition-transform group-hover:scale-[1.02] sm:w-56 sm:self-auto"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {centre && (
                        <span className="text-body-sm text-content-secondary">
                            All-time favourite:{" "}
                            <span className="font-semibold text-content">
                                {centre.game.title}
                            </span>
                        </span>
                    )}
                    <span className="font-mono text-label-sm text-content-muted">
                        {count} of {GAMING_25_SIZE} picked
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-body-sm font-medium text-brand">
                        {isOwner && count < GAMING_25_SIZE
                            ? "Carry on with it"
                            : "See it in full"}
                        <ArrowRight
                            size={14}
                            aria-hidden
                            className="transition-transform group-hover:translate-x-0.5"
                        />
                    </span>
                </span>
            </Link>
        </Panel>
    );
};

export default Gaming25Preview;
