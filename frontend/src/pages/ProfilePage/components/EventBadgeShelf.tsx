import { Link } from "react-router-dom";
import { eventPath } from "@playrates/shared";
import { useHeldEventBadges } from "../../../hooks/queries/useEvents";
import { EVENT_BADGE_ICONS } from "../../../components/events/eventBadgeIcons";
import { formatDate } from "../../../lib/format";

/**
 * The badges someone earned at events, with the rest of their badges. Each
 * could only be had while its event was on, so each says which and when,
 * and leads back to it. Nothing at all for someone who has none.
 */
const EventBadgeShelf = ({ username }: { username: string }) => {
    const { data: held } = useHeldEventBadges(username);
    if (!held || held.length === 0) return null;
    return (
        <section className="mb-6 break-inside-avoid">
            <h3 className="mb-1 font-mono text-[11px] tracking-[0.15em] text-content-muted uppercase">
                Events
            </h3>
            <ul>
                {held.map((badge) => {
                    const Icon = EVENT_BADGE_ICONS[badge.icon];
                    return (
                        <li
                            key={`${badge.event.slug}-${badge.key}`}
                            className="flex items-center gap-3 py-1.5"
                        >
                            <span
                                aria-hidden
                                className="m-1 grid size-11 shrink-0 place-items-center rounded-full bg-brand text-content-on-solid shadow-solid"
                            >
                                <Icon size={20} strokeWidth={2} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-body-sm font-medium text-content">
                                    {badge.name}
                                </span>
                                <span className="truncate text-label-sm text-content-muted">
                                    <Link
                                        to={eventPath(badge.event.slug)}
                                        className="text-content-secondary hover:text-content hover:underline"
                                    >
                                        {badge.event.name}
                                    </Link>
                                    {" · "}
                                    {formatDate(badge.earnedAt)}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default EventBadgeShelf;
