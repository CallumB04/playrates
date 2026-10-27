import { NavLink } from "react-router-dom";
import { profilePath } from "../../../lib/profilePaths";
import { useOverflowFade } from "../../../hooks/useOverflowFade";
import { cn } from "../../../lib/cn";
import type { ProfileView } from "@playrates/shared";
import { formatCount } from "../../../lib/format";
import type { ProfileTab } from "../lib/profileViews";

const TABS: { tab: ProfileTab; label: string }[] = [
    { tab: "profile", label: "Profile" },
    { tab: "games", label: "Games" },
    { tab: "reviews", label: "Reviews" },
    { tab: "community", label: "Community" },
    { tab: "friends", label: "Friends" },
];

interface ProfileNavProps {
    username: string;
    /** How many are behind each view, once known. The profile has none. */
    counts: Partial<Record<ProfileView, number>>;
    /** Friend requests waiting on the owner. Only ever set on your own. */
    requestCount?: number;
}

/** The views of one profile. Links rather than tabs, so each has a URL to
 *  share and the back button steps between them. */
const ProfileNav = ({
    username,
    counts,
    requestCount = 0,
}: ProfileNavProps) => {
    const fade = useOverflowFade<HTMLDivElement>();

    return (
        <nav aria-label="Profile" className="border-b border-subtle">
            <div
                ref={fade.ref}
                onScroll={fade.onScroll}
                style={fade.style}
                className="-mb-px flex [scrollbar-width:none] overflow-x-auto [contain:layout] sm:gap-1 [&::-webkit-scrollbar]:hidden"
            >
                {TABS.map(({ tab, label }) => {
                    const count = tab === "profile" ? undefined : counts[tab];
                    return (
                        <NavLink
                            key={tab}
                            to={profilePath(
                                username,
                                tab === "profile" ? undefined : tab
                            )}
                            end
                            className={({ isActive }) =>
                                cn(
                                    /* Count under the label on a phone, so five
                                       share its width rather than scrolling. */
                                    "flex min-h-11 flex-1 shrink-0 flex-col items-center justify-center border-b-2 px-1 py-1 text-label whitespace-nowrap transition-colors sm:flex-none sm:flex-row sm:gap-1.5 sm:px-4 sm:text-body-sm",
                                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                    isActive
                                        ? "border-brand font-medium text-content"
                                        : "border-transparent text-content-secondary hover:text-content"
                                )
                            }
                        >
                            {label}
                            <span className="flex min-h-4 items-center gap-1 font-mono text-label-sm text-content-muted tabular-nums sm:empty:hidden">
                                {count !== undefined && formatCount(count)}
                                {tab === "friends" && requestCount > 0 && (
                                    <>
                                        <span
                                            aria-hidden
                                            className="size-1.5 rounded-full bg-brand"
                                        />
                                        <span className="sr-only">
                                            , {formatCount(requestCount)}{" "}
                                            {requestCount === 1
                                                ? "request"
                                                : "requests"}{" "}
                                            waiting
                                        </span>
                                    </>
                                )}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default ProfileNav;
