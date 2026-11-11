import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import {
    SITE_BOARD_TOP,
    type HiddenLeaderboardRow,
    type LeaderboardPeriod,
    type LeaderboardRow,
    type ProfileAccent,
    type SiteLeaderboardRow,
} from "@playrates/shared";
import AsideCard from "../ui/AsideCard";
import SegmentedChoice from "../ui/SegmentedChoice";
import Skeleton from "../ui/Skeleton";
import { EmptyNote } from "../ui/EmptyPlate";
import ProfilePicture from "../ProfilePicture";
import AvatarFrame from "../progress/AvatarFrame";
import NameText from "../progress/NameText";
import { useSiteLeaderboard } from "../../hooks/queries/useProgress";
import { formatCount } from "../../lib/format";
import { profilePath } from "../../lib/profilePaths";
import { cn } from "../../lib/cn";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "all", label: "All time" },
];

const NOBODY: Record<LeaderboardPeriod, string> = {
    week: "Nobody’s earned XP this week yet.",
    month: "Nobody’s earned XP this month yet.",
    all: "Nobody’s earned XP yet.",
};

const Rank = ({ rank }: { rank: number }) => (
    <span
        className={cn(
            "w-6 shrink-0 font-mono text-label-sm tabular-nums",
            rank === 1 ? "font-semibold text-brand-text" : "text-content-muted"
        )}
    >
        {formatCount(rank)}
    </span>
);

const Xp = ({ xp }: { xp: number }) => (
    <span className="shrink-0 font-mono text-label-sm text-content-muted tabular-nums">
        {formatCount(xp)} XP
    </span>
);

/** Someone whose profile you can't open: their place, and nothing to
 *  follow to them. */
const HiddenRow = ({ row }: { row: HiddenLeaderboardRow }) => (
    <div className="flex items-center gap-2.5 px-3 py-2">
        <Rank rank={row.rank} />
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-content-muted">
            <Lock size={11} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-body-sm text-content-muted">
            Private player
        </span>
        <Xp xp={row.xp} />
    </div>
);

const Row = ({ row }: { row: LeaderboardRow }) => (
    <Link
        to={profilePath(row.username)}
        className={cn(
            "flex items-center gap-2.5 rounded-sm px-3 py-2 lift focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            row.isYou ? "bg-brand-subtle" : "hover:bg-surface-hover"
        )}
    >
        <Rank rank={row.rank} />
        <AvatarFrame frame={row.frame} size="sm">
            <ProfilePicture
                variant="tab"
                file={row.avatarUrl ?? ""}
                username={row.username}
                accent={row.accent as ProfileAccent}
                link={false}
            />
        </AvatarFrame>
        <span
            className={cn(
                "min-w-0 flex-1 truncate text-body-sm",
                row.isYou ? "font-semibold text-brand-text" : "text-content"
            )}
        >
            {row.isYou ? (
                "You"
            ) : (
                <NameText font={row.nameFont} colour={row.nameColour}>
                    {row.username}
                </NameText>
            )}
        </span>
        <Xp xp={row.xp} />
    </Link>
);

/**
 * Everyone by XP for the week, the month or all time, those whose
 * profiles you can't open in their places without their names: the top
 * five, then you with one either side, a break between the two.
 */
const SiteLeaderboard = () => {
    const [period, setPeriod] = useState<LeaderboardPeriod>("week");
    const { data, isPending, isError } = useSiteLeaderboard(period);
    const rows: SiteLeaderboardRow[] = data?.rows ?? [];
    // You alone at nought is no board yet.
    const empty = rows.every((row) => row.xp === 0);
    // A board that won't load isn't a board with nobody on it.
    if (isError && !data) return null;

    return (
        <AsideCard
            title="Leaderboard"
            label="Leaderboard"
            trailing={
                data &&
                !empty && (
                    <span className="text-label-sm text-content-muted tabular-nums">
                        {formatCount(data.total)}{" "}
                        {data.total === 1 ? "player" : "players"}
                    </span>
                )
            }
            bodyClassName=""
        >
            <div className="px-3 pt-1 pb-2">
                <SegmentedChoice
                    segments={PERIODS}
                    value={period}
                    onChange={setPeriod}
                    label="Period"
                    fill
                />
            </div>
            {isPending ? (
                <ul aria-busy className="flex flex-col">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <li
                            key={i}
                            className="flex items-center gap-2.5 px-3 py-2"
                        >
                            <Skeleton className="h-3 w-4" />
                            <Skeleton round className="size-6 shrink-0" />
                            <Skeleton
                                className={cn("h-3", i % 2 ? "w-16" : "w-24")}
                            />
                            <span className="flex-1" />
                            <Skeleton className="h-3 w-12" />
                        </li>
                    ))}
                </ul>
            ) : empty ? (
                <div className="px-3 pb-1.5">
                    <EmptyNote>{NOBODY[period]}</EmptyNote>
                </div>
            ) : (
                <ul className="stagger">
                    {rows.map((row, i) => (
                        <Fragment
                            key={row.hidden ? `#${row.rank}` : row.username}
                        >
                            {/* Under the top, even when the next place
                                follows on: the top five are their own. */}
                            {i > 0 &&
                                row.rank > SITE_BOARD_TOP &&
                                rows[i - 1]!.rank <= SITE_BOARD_TOP && (
                                    <li
                                        aria-hidden
                                        className="flex items-center gap-2 px-3 py-1 text-content-muted"
                                    >
                                        <span className="h-px flex-1 border-t border-dashed border-strong" />
                                        <span className="text-label-sm leading-none">
                                            ···
                                        </span>
                                        <span className="h-px flex-1 border-t border-dashed border-strong" />
                                    </li>
                                )}
                            <li>
                                {row.hidden ? (
                                    <HiddenRow row={row} />
                                ) : (
                                    <Row row={row} />
                                )}
                            </li>
                        </Fragment>
                    ))}
                </ul>
            )}
        </AsideCard>
    );
};

export default SiteLeaderboard;
