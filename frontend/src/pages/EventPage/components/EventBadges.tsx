import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import type { EventDetail } from "@playrates/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import { useMyEventBadges } from "../../../hooks/queries/useEvents";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { EVENT_BADGE_ICONS } from "../../../components/events/eventBadgeIcons";

const holders = (count: number) =>
    count === 1 ? "1 member has it" : `${formatCount(count)} members have it`;

const BadgeState = ({ has, over }: { has: boolean; over: boolean }) =>
    has ? (
        <span className="inline-flex items-center gap-1 font-semibold text-brand-text">
            <Check size={13} strokeWidth={3} aria-hidden />
            You have it
        </span>
    ) : (
        <span className="text-content-muted">
            {over ? "Missed" : "Not yet"}
        </span>
    );

/**
 * The badges an event gives, a few at most, earned only while it's on.
 * Yours are lit; the rest wait in outline. One earned while you're here is
 * said aloud.
 */
const EventBadges = ({ event }: { event: EventDetail }) => {
    const { user } = useAuth();
    const notify = useNotify();
    const { data: mine } = useMyEventBadges(event.slug, !!user);
    const held = new Set(mine ?? []);
    const seen = useRef<Set<string> | null>(null);

    useEffect(() => {
        if (!mine) return;
        // The first answer is what you already had; only news after it.
        if (seen.current) {
            for (const key of mine) {
                if (!seen.current.has(key)) {
                    const badge = event.badges.find((b) => b.key === key);
                    if (badge) notify(`Badge earned: ${badge.name}`, "success");
                }
            }
        }
        seen.current = new Set(mine);
    }, [mine, event.badges, notify]);

    if (event.badges.length === 0) return null;
    const over = event.timing === "past";
    return (
        <section aria-labelledby="event-badges" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2
                    id="event-badges"
                    className="font-display text-section text-content"
                >
                    Badges
                </h2>
                <p className="text-body-sm text-content-secondary">
                    {over
                        ? "These could only be earned while it was on."
                        : "Only while it’s on: once it’s over, they’re gone."}
                </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {event.badges.map((badge) => {
                    const Icon = EVENT_BADGE_ICONS[badge.icon];
                    const has = held.has(badge.key);
                    return (
                        <li
                            key={badge.key}
                            className={cn(
                                "relative isolate flex items-center gap-4 overflow-hidden rounded-lg border p-4 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0",
                                has
                                    ? "border-brand/50 bg-surface-raised"
                                    : "border-subtle bg-surface-raised"
                            )}
                        >
                            <div className="flex shrink-0 justify-center sm:pt-7 sm:pb-4">
                                <span
                                    aria-hidden
                                    className={cn(
                                        "grid size-14 place-items-center rounded-full sm:size-18",
                                        has
                                            ? "bg-brand text-content-on-solid shadow-solid"
                                            : "bg-surface-sunken text-content-muted ring-1 ring-subtle"
                                    )}
                                >
                                    <Icon
                                        className="size-6 sm:size-8"
                                        strokeWidth={2}
                                    />
                                </span>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:items-center sm:px-5 sm:pb-5 sm:text-center">
                                <p className="font-display text-body font-semibold text-content">
                                    {badge.name}
                                </p>
                                <p className="text-body-sm text-content-secondary">
                                    {badge.description}
                                </p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-label-sm sm:hidden">
                                    <BadgeState has={has} over={over} />
                                    <span className="text-content-muted">
                                        · {holders(badge.earned)}
                                    </span>
                                </p>
                            </div>
                            <div className="mt-auto hidden items-center justify-between border-t border-subtle px-5 py-3 text-label-sm sm:flex">
                                <BadgeState has={has} over={over} />
                                <span className="text-content-muted">
                                    {holders(badge.earned)}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default EventBadges;
