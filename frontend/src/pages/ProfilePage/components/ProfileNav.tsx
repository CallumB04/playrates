import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    Award,
    Gamepad2,
    ListOrdered,
    MessagesSquare,
    PenLine,
    UserRound,
    Users,
} from "lucide-react";
import type { ProfileView } from "@playrates/shared";
import {
    CountPill,
    SwitcherButton,
    SwitcherSheet,
    SwitcherTileBody,
    switcherTileClass,
} from "../../../components/ui/SectionSwitcher";
import { profilePath } from "../../../lib/profilePaths";
import { formatCount } from "../../../lib/format";
import type { IconComponent } from "../../../lib/icons";
import { cn } from "../../../lib/cn";
import type { ProfileTab } from "../lib/profileViews";

const TABS: { tab: ProfileTab; label: string; icon: IconComponent }[] = [
    { tab: "profile", label: "Profile", icon: UserRound },
    { tab: "games", label: "Games", icon: Gamepad2 },
    { tab: "reviews", label: "Reviews", icon: PenLine },
    { tab: "lists", label: "Lists", icon: ListOrdered },
    { tab: "badges", label: "Badges", icon: Award },
    { tab: "community", label: "Community", icon: MessagesSquare },
    { tab: "friends", label: "Friends", icon: Users },
];

interface ProfileNavProps {
    username: string;
    active: ProfileTab;
    /** How many are behind each view, once known. The profile has none. */
    counts: Partial<Record<ProfileView, number>>;
    /** Friend requests waiting on the owner. Only ever set on your own. */
    requestCount?: number;
}

const pathOf = (username: string, tab: ProfileTab) =>
    profilePath(username, tab === "profile" ? undefined : tab);

const RequestsDot = ({ count }: { count: number }) => (
    <>
        <span aria-hidden className="size-1.5 rounded-full bg-brand" />
        <span className="sr-only">
            , {formatCount(count)} {count === 1 ? "request" : "requests"}{" "}
            waiting
        </span>
    </>
);

/** The views of one profile. Links rather than tabs, so each has a URL to
 *  share and the back button steps between them. */
const ProfileNav = ({
    username,
    active,
    counts,
    requestCount = 0,
}: ProfileNavProps) => {
    const [sheetOpen, setSheetOpen] = useState(false);
    const countOf = (tab: ProfileTab) =>
        tab === "profile" ? undefined : counts[tab];
    const current = TABS.find((t) => t.tab === active) ?? TABS[0]!;
    const currentCount = countOf(current.tab);

    return (
        <nav aria-label="Profile">
            {/* A phone: seven tabs in its width were cramped or scrolled, so
                one control says where you are and opens the rest. */}
            <SwitcherButton
                icon={current.icon}
                label={current.label}
                count={currentCount}
                open={sheetOpen}
                onOpen={() => setSheetOpen(true)}
                extra={
                    // Requests wait in Friends; from anywhere else, say so.
                    requestCount > 0 &&
                    current.tab !== "friends" && (
                        <span className="flex items-center">
                            <RequestsDot count={requestCount} />
                        </span>
                    )
                }
            />

            {sheetOpen && (
                <SwitcherSheet
                    titleId="profile-views-title"
                    onClose={() => setSheetOpen(false)}
                    title={
                        <>
                            {username}
                            <span className="text-content-muted">
                                ’s profile
                            </span>
                        </>
                    }
                >
                    {TABS.map(({ tab, label, icon }) => (
                        <li key={tab}>
                            <NavLink
                                to={pathOf(username, tab)}
                                end
                                onClick={() => setSheetOpen(false)}
                                className={switcherTileClass(tab === active)}
                            >
                                <SwitcherTileBody
                                    icon={icon}
                                    label={label}
                                    active={tab === active}
                                    count={countOf(tab)}
                                    note={
                                        tab === "friends" &&
                                        requestCount > 0 && (
                                            <span className="text-label-sm text-brand-text">
                                                {formatCount(requestCount)} new
                                            </span>
                                        )
                                    }
                                />
                            </NavLink>
                        </li>
                    ))}
                </SwitcherSheet>
            )}

            <div className="hidden gap-1 border-b border-subtle sm:flex">
                {TABS.map(({ tab, label }) => {
                    const count = countOf(tab);
                    const flagged = tab === "friends" && requestCount > 0;
                    return (
                        <NavLink
                            key={tab}
                            to={pathOf(username, tab)}
                            end
                            className={({ isActive }) =>
                                cn(
                                    "-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-body-sm whitespace-nowrap transition-colors",
                                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                    isActive
                                        ? "border-brand font-medium text-content"
                                        : "border-transparent text-content-secondary hover:text-content"
                                )
                            }
                        >
                            {label}
                            {(count !== undefined || flagged) && (
                                <span className="flex items-center gap-1.5">
                                    {count !== undefined && (
                                        <CountPill value={count} />
                                    )}
                                    {flagged && (
                                        <RequestsDot count={requestCount} />
                                    )}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default ProfileNav;
