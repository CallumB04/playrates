import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    Award,
    ChevronDown,
    Gamepad2,
    ListOrdered,
    MessagesSquare,
    PenLine,
    UserRound,
    Users,
} from "lucide-react";
import type { ProfileView } from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
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

const CountPill = ({ value }: { value: number }) => (
    // Leading off, so the pill sits on the word's centre, not its baseline.
    <span className="rounded-full bg-surface-sunken px-2 py-1 font-mono text-label-sm leading-none text-content-secondary tabular-nums">
        {formatCount(value)}
    </span>
);

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
    const CurrentIcon = current.icon;
    const currentCount = countOf(current.tab);

    return (
        <nav aria-label="Profile">
            {/* A phone: seven tabs in its width were cramped or scrolled, so
                one control says where you are and opens the rest. It has to
                read as a way around the profile, not a heading. */}
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen(true)}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border border-brand/50 bg-surface-raised py-2 pr-2 pl-3 text-left shadow-lip lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:hidden"
            >
                <CurrentIcon
                    size={20}
                    aria-hidden
                    className="shrink-0 text-brand"
                />
                <span className="min-w-0 flex-1">
                    <span className="block text-label-sm text-content-muted">
                        Viewing
                    </span>
                    <span className="flex items-center gap-2 text-body font-semibold text-content">
                        {current.label}
                        {currentCount !== undefined && (
                            <CountPill value={currentCount} />
                        )}
                    </span>
                </span>
                {/* Requests wait in Friends; from anywhere else, say so. */}
                {requestCount > 0 && current.tab !== "friends" && (
                    <span className="flex items-center">
                        <RequestsDot count={requestCount} />
                    </span>
                )}
                <span className="flex min-h-9 items-center gap-1 rounded-sm bg-brand-subtle px-3 text-label font-medium text-brand">
                    Switch
                    <ChevronDown size={16} aria-hidden />
                </span>
            </button>

            {sheetOpen && (
                <Modal
                    onClose={() => setSheetOpen(false)}
                    labelledBy="profile-views-title"
                    className="w-full max-w-sm"
                >
                    <h2
                        id="profile-views-title"
                        className="pr-10 font-display text-section text-content"
                    >
                        {username}
                        <span className="text-content-muted">’s profile</span>
                    </h2>
                    <ul className="mt-4 grid grid-cols-2 gap-2">
                        {TABS.map(({ tab, label, icon: Icon }) => {
                            const count = countOf(tab);
                            const isActive = tab === active;
                            return (
                                <li key={tab}>
                                    <NavLink
                                        to={pathOf(username, tab)}
                                        end
                                        onClick={() => setSheetOpen(false)}
                                        className={cn(
                                            "flex min-h-[76px] flex-col justify-between gap-2 rounded-md border p-3 lift",
                                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                            isActive
                                                ? "border-brand/60 bg-brand-subtle text-content"
                                                : "border-subtle text-content-secondary hover:border-strong hover:bg-surface-hover hover:text-content"
                                        )}
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <Icon
                                                size={20}
                                                aria-hidden
                                                className={cn(
                                                    "shrink-0",
                                                    isActive
                                                        ? "text-brand"
                                                        : "text-content-muted"
                                                )}
                                            />
                                            {count !== undefined && (
                                                <CountPill value={count} />
                                            )}
                                        </span>
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span
                                                className={cn(
                                                    "text-body",
                                                    isActive && "font-semibold"
                                                )}
                                            >
                                                {label}
                                            </span>
                                            {tab === "friends" &&
                                                requestCount > 0 && (
                                                    <span className="text-label-sm text-brand">
                                                        {formatCount(
                                                            requestCount
                                                        )}{" "}
                                                        new
                                                    </span>
                                                )}
                                        </span>
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </Modal>
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
