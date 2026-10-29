import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AsideCard from "../ui/AsideCard";
import { Skeleton } from "../ui/Skeleton";
import BadgeTip from "./BadgeTip";
import { showcaseOf } from "./ShowcaseView";
import { usePlayerBadges } from "../../hooks/queries/useProgress";
import { formatCount } from "../../lib/format";
import { profilePath } from "../../lib/profilePaths";

/** Someone's level, XP and badges on their profile, with the badges they
 *  pinned. Public, like the rest of the card. */
const LevelCard = ({
    username,
    isOwner,
}: {
    username: string;
    isOwner: boolean;
}) => {
    const { data } = usePlayerBadges(username);
    const pinned = data ? showcaseOf(data) : [];
    const rarity = new Map(
        data?.held.map((h) => [`${h.badge}:${h.metal}`, h.rarity])
    );
    // Only on your own: someone else's counts aren't yours to see.
    const values = new Map(data?.progress?.map((p) => [p.badge, p.value]));

    return (
        <AsideCard
            title="Level"
            trailing={
                <Link
                    to={profilePath(username, "badges")}
                    className="relative inline-flex items-center gap-1 text-label-sm font-medium text-brand before:absolute before:-inset-2 before:content-[''] hover:underline"
                >
                    Badges
                    <ArrowRight size={12} aria-hidden />
                </Link>
            }
        >
            {data ? (
                <>
                    <div className="flex items-end gap-4">
                        <span className="font-display text-[40px] leading-none font-bold text-content tabular-nums">
                            {data.level}
                        </span>
                        <dl className="flex gap-4 pb-1 text-label-sm text-content-muted">
                            <div>
                                <dd className="font-mono text-label font-semibold text-content tabular-nums">
                                    {formatCount(data.xp)}
                                </dd>
                                <dt>XP</dt>
                            </div>
                            <div>
                                <dd className="font-mono text-label font-semibold text-content tabular-nums">
                                    {formatCount(data.held.length)}
                                </dd>
                                <dt>
                                    {data.held.length === 1
                                        ? "Badge"
                                        : "Badges"}
                                </dt>
                            </div>
                        </dl>
                    </div>
                    {pinned.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                            {pinned.map(({ def, metal }) => (
                                <li key={def.key}>
                                    <BadgeTip
                                        badge={def}
                                        metal={metal}
                                        rarity={
                                            rarity.get(`${def.key}:${metal}`) ??
                                            0
                                        }
                                        value={values.get(def.key)}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        isOwner && (
                            <p className="mt-3 text-label-sm text-content-muted">
                                Pin your best badges here from the Badges tab.
                            </p>
                        )
                    )}
                </>
            ) : (
                <Skeleton className="h-16 rounded-md" />
            )}
        </AsideCard>
    );
};

export default LevelCard;
