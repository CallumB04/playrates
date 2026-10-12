import { useEffect, useRef, useState } from "react";
import { popoverClass } from "../ui/popover";
import { Link } from "react-router-dom";
import {
    ListChecks,
    LogOut,
    Moon,
    Settings,
    Shield,
    Sun,
    UserRound,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { GAME_STATUSES, STATUS_PRESENTATION } from "../../constants/gameStatus";
import type { MyProfile } from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import { cn } from "../../lib/cn";
import { useDismiss } from "../../hooks/useDismiss";
import { BREAKPOINT, useMediaQuery } from "../../hooks/useMediaQuery";
import type { SetupStep } from "../../lib/setupChecklist";
import { MENU_ITEM as ITEM, ProgressRing, SetupSteps } from "./SetupSteps";

/** Long enough to cross the gap into the list on a diagonal. */
const HOVER_CLOSE_MS = 150;

/**
 * One row in the menu; the steps open off it. From sm a pointer resting on
 * the row opens them beside the menu, and they stay open while the pointer
 * is on either, so the steps can be reached. A phone has no hover and no
 * room beside the menu, so a tap opens them under the row instead.
 */
const SetupRow = ({
    steps,
    onNavigate,
}: {
    steps: SetupStep[];
    onNavigate: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const isPhone = !useMediaQuery(BREAKPOINT.sm);
    const closing = useRef<number | undefined>(undefined);
    const done = steps.filter((step) => step.done).length;

    useEffect(() => () => window.clearTimeout(closing.current), []);

    const hover = (entering: boolean) => {
        if (isPhone) return;
        window.clearTimeout(closing.current);
        if (entering) setOpen(true);
        else
            closing.current = window.setTimeout(
                () => setOpen(false),
                HOVER_CLOSE_MS
            );
    };

    return (
        <div
            className="relative mb-1.5 border-b border-subtle pb-1.5"
            onMouseEnter={() => hover(true)}
            onMouseLeave={() => hover(false)}
        >
            <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open}
                // Opens rather than toggles from sm: a tap on a tablet
                // fires the hover first, and a toggle would shut it again.
                onClick={() => setOpen((was) => (isPhone ? !was : true))}
                className={cn(
                    ITEM,
                    "cursor-pointer",
                    open && "bg-surface-hover text-content"
                )}
            >
                <ListChecks
                    size={15}
                    aria-hidden
                    className="shrink-0 text-brand"
                />
                <span className="min-w-0 flex-1">Get started</span>
                <span className="font-mono text-label text-content-muted">
                    {done}/{steps.length}
                </span>
                <ProgressRing share={done / steps.length} />
            </button>

            {open &&
                (isPhone ? (
                    <div role="menu" aria-label="Profile setup">
                        <SetupSteps
                            steps={steps}
                            done={done}
                            onNavigate={onNavigate}
                            itemRole="menuitem"
                        />
                    </div>
                ) : (
                    /* Its padding is the bridge: still inside the hovered
                       element while the pointer crosses the gap. */
                    <div className="absolute top-[-0.375rem] right-full pr-3">
                        <div
                            role="menu"
                            aria-label="Profile setup"
                            className={popoverClass("w-60 p-1.5", "menu")}
                        >
                            <SetupSteps
                                steps={steps}
                                done={done}
                                onNavigate={onNavigate}
                                itemRole="menuitem"
                            />
                        </div>
                    </div>
                ))}
        </div>
    );
};

/** The avatar, and the account menu behind it. */
const AccountMenu = ({
    user,
    onSignOut,
    setup = null,
}: {
    user: MyProfile;
    onSignOut: () => void;
    /** Steps left in setting up the profile; null once there are none. */
    setup?: SetupStep[] | null;
}) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme } = useTheme();

    useDismiss([wrapRef], () => setOpen(false), {
        enabled: open,
        escape: true,
    });

    return (
        // The bell glyph's padding on this side, as margin: 8px in a 36px
        // box plus the glyph's own 1.7px, 12px plus it in a 44px one.
        <div ref={wrapRef} className="relative ml-2.5 sm:ml-3.5 xl:ml-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Account menu"
                className={cn(
                    "relative block rounded-full ring-offset-2 ring-offset-surface transition-shadow lift",
                    "before:absolute before:-inset-1 before:content-[''] sm:before:hidden",
                    open
                        ? "ring-2 ring-brand"
                        : "hover:ring-2 hover:ring-subtle"
                )}
            >
                <ProfilePicture
                    variant="nav"
                    file={user.avatarUrl ?? ""}
                    accent={user.accent}
                    username={user.username}
                    link={false}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className={popoverClass(
                        cn(
                            "absolute top-[calc(100%+0.6rem)] right-0 z-40 w-60 p-1.5",
                            /* In the sticky header the page cannot scroll to
                               a tall menu, so on a phone it scrolls itself.
                               Not from sm, where scrolling would clip the
                               setup steps that sit beside it. */
                            "max-sm:max-h-[calc(100dvh-5.5rem)] max-sm:overflow-y-auto"
                        ),
                        "menu"
                    )}
                >
                    <p className="mb-1.5 truncate border-b border-subtle px-2.5 pt-1.5 pb-2.5 text-label text-content-muted">
                        {user.username}
                    </p>
                    {setup && (
                        <SetupRow
                            steps={setup}
                            onNavigate={() => setOpen(false)}
                        />
                    )}
                    <Link
                        to={`/user/${user.username}`}
                        onClick={() => setOpen(false)}
                        className={ITEM}
                        role="menuitem"
                    >
                        <UserRound size={15} aria-hidden /> Your profile
                    </Link>

                    {/* The shelves. Backlog used to be a top-level nav item,
                        which gave one of the four states a promotion the
                        other three never earned. */}
                    <div className="my-1.5 border-y border-subtle py-1.5">
                        {GAME_STATUSES.map((status) => {
                            const {
                                label,
                                icon: Icon,
                                markTone,
                            } = STATUS_PRESENTATION[status];
                            return (
                                <Link
                                    key={status}
                                    to={`/user/${user.username}?type=${status}`}
                                    onClick={() => setOpen(false)}
                                    className={ITEM}
                                    role="menuitem"
                                >
                                    <Icon
                                        size={15}
                                        aria-hidden
                                        className={cn("shrink-0", markTone)}
                                    />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>

                    <Link
                        to="/settings"
                        onClick={() => setOpen(false)}
                        className={ITEM}
                        role="menuitem"
                    >
                        <Settings size={15} aria-hidden /> Settings
                    </Link>
                    {/* Here, where sites keep it, rather than on the
                        profile page. The menu stays open to show it took. */}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={toggleTheme}
                        className={cn(ITEM, "cursor-pointer")}
                    >
                        {theme === "dark" ? (
                            <Sun size={15} aria-hidden />
                        ) : (
                            <Moon size={15} aria-hidden />
                        )}
                        {theme === "dark" ? "Day mode" : "Night mode"}
                    </button>
                    {user.isAdmin && (
                        <Link
                            to="/admin"
                            onClick={() => setOpen(false)}
                            className={ITEM}
                            role="menuitem"
                        >
                            <Shield size={15} aria-hidden /> Admin
                        </Link>
                    )}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            onSignOut();
                        }}
                        className={cn(
                            ITEM,
                            "cursor-pointer text-danger hover:bg-danger-subtle hover:text-danger"
                        )}
                    >
                        <LogOut size={15} aria-hidden /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccountMenu;
