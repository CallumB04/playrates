import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    Check,
    ChevronDown,
    Gamepad2,
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
    const CurrentIcon = current.icon;
    const currentCount = countOf(current.tab);

    return (
        <nav aria-label="Profile">
            {/* A phone: five tabs in its width were cramped or scrolled, so
                one control says where you are and opens the rest. */}
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen(true)}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md border border-subtle bg-surface-raised px-3.5 text-left shadow-lip lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:hidden"
            >
                <CurrentIcon size={18} aria-hidden className="text-brand" />
                <span className="font-medium text-content">
                    {current.label}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-label-sm text-content-muted tabular-nums">
                    {currentCount !== undefined && formatCount(currentCount)}
                    {/* Requests wait in Friends; from anywhere else, say so. */}
                    {requestCount > 0 && <RequestsDot count={requestCount} />}
                </span>
                <ChevronDown
                    size={18}
                    aria-hidden
                    className="ml-auto text-content-muted"
                />
                <span className="sr-only">, change view</span>
            </button>

            {sheetOpen && (
                <Modal
                    onClose={() => setSheetOpen(false)}
                    labelledBy="profile-views-title"
                    className="w-full max-w-sm"
                >
                    <h2
                        id="profile-views-title"
                        className="font-display text-section text-content"
                    >
                        {username}
                    </h2>
                    <ul className="mt-3 flex flex-col gap-1">
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
                                            "flex min-h-12 items-center gap-3 rounded-sm px-3 lift",
                                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                            isActive
                                                ? "bg-surface-sunken font-medium text-content"
                                                : "text-content-secondary hover:bg-surface-hover hover:text-content"
                                        )}
                                    >
                                        <Icon
                                            size={18}
                                            aria-hidden
                                            className={cn(
                                                "shrink-0",
                                                isActive
                                                    ? "text-brand"
                                                    : "text-content-muted"
                                            )}
                                        />
                                        <span className="flex-1">{label}</span>
                                        {tab === "friends" &&
                                            requestCount > 0 && (
                                                <span className="text-label-sm text-brand">
                                                    {formatCount(requestCount)}{" "}
                                                    {requestCount === 1
                                                        ? "request"
                                                        : "requests"}
                                                </span>
                                            )}
                                        {count !== undefined && (
                                            <span className="font-mono text-label-sm text-content-muted tabular-nums">
                                                {formatCount(count)}
                                            </span>
                                        )}
                                        <Check
                                            size={16}
                                            aria-hidden
                                            className={cn(
                                                "shrink-0 text-brand",
                                                !isActive && "invisible"
                                            )}
                                        />
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
                                    "-mb-px flex min-h-11 items-center gap-1.5 border-b-2 px-4 text-body-sm whitespace-nowrap transition-colors",
                                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                    isActive
                                        ? "border-brand font-medium text-content"
                                        : "border-transparent text-content-secondary hover:text-content"
                                )
                            }
                        >
                            {label}
                            {(count !== undefined || flagged) && (
                                <span className="flex items-center gap-1 font-mono text-label-sm text-content-muted tabular-nums">
                                    {count !== undefined && formatCount(count)}
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
