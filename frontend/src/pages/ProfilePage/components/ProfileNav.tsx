import { NavLink } from "react-router-dom";
import { profilePath } from "../../../lib/profilePaths";
import { useOverflowFade } from "../../../hooks/useOverflowFade";
import { cn } from "../../../lib/cn";
import type { ProfileTab } from "../lib/profileViews";

const TABS: { tab: ProfileTab; label: string }[] = [
    { tab: "profile", label: "Profile" },
    { tab: "games", label: "Games" },
    { tab: "reviews", label: "Reviews" },
    { tab: "threads", label: "Threads" },
    { tab: "friends", label: "Friends" },
];

/** The views of one profile. Links rather than tabs, so each has a URL to
 *  share and the back button steps between them. */
const ProfileNav = ({ username }: { username: string }) => {
    const fade = useOverflowFade<HTMLDivElement>();

    return (
        <nav aria-label="Profile" className="border-b border-subtle">
            <div
                ref={fade.ref}
                onScroll={fade.onScroll}
                style={fade.style}
                className="-mb-px flex [scrollbar-width:none] overflow-x-auto [contain:layout] sm:gap-1 [&::-webkit-scrollbar]:hidden"
            >
                {TABS.map(({ tab, label }) => (
                    <NavLink
                        key={tab}
                        to={profilePath(
                            username,
                            tab === "profile" ? undefined : tab
                        )}
                        end
                        className={({ isActive }) =>
                            cn(
                                // Shares a phone's width five ways rather than scrolling.
                                "flex min-h-11 flex-1 shrink-0 items-center justify-center border-b-2 px-2 text-body-sm whitespace-nowrap transition-colors sm:flex-none sm:px-4",
                                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                isActive
                                    ? "border-brand font-medium text-content"
                                    : "border-transparent text-content-secondary hover:text-content"
                            )
                        }
                    >
                        {label}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default ProfileNav;
