import { useEffect, useRef, useState } from "react";
import { popoverClass } from "../ui/popover";
import { Link } from "react-router-dom";
import {
    Check,
    ChevronDown,
    ChevronLeft,
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
import Progress from "../ui/Progress";
import type { SetupStep } from "../../lib/setupChecklist";

const ITEM =
    "flex min-h-11 w-full items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-left text-body-sm leading-none text-content-secondary transition-colors hover:bg-surface-hover hover:text-content sm:min-h-0";

/* Around the avatar, drawn as an arc: enough to notice something is
   unfinished without a badge shouting about it. 42px across a 36px avatar. */
const RING_RADIUS = 19;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const SetupRing = ({ share }: { share: number }) => (
    <svg
        aria-hidden
        viewBox="0 0 42 42"
        className="pointer-events-none absolute -inset-[3px] -rotate-90"
    >
        <circle
            cx="21"
            cy="21"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            className="stroke-subtle"
        />
        <circle
            cx="21"
            cy="21"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${share * RING_LENGTH} ${RING_LENGTH}`}
            className="stroke-brand transition-[stroke-dasharray] duration-500"
        />
    </svg>
);

/** Long enough to cross the gap into the list on a diagonal. */
const HOVER_CLOSE_MS = 150;

/** The steps themselves, with a bar and a count. Done steps stay, ticked:
 *  two of four already done is the pull to finish the other two. */
const SetupSteps = ({
    steps,
    done,
    onNavigate,
}: {
    steps: SetupStep[];
    done: number;
    onNavigate: () => void;
}) => (
    <>
        <Progress
            value={done / steps.length}
            size="sm"
            label={`${done} of ${steps.length} setup steps done`}
            className="mx-2.5 mt-1 mb-1.5"
        />
        <ul>
            {steps.map((step) => (
                <li key={step.key}>
                    {step.done ? (
                        <span className="flex min-h-11 items-center gap-2.5 px-2.5 text-body-sm text-content-muted line-through decoration-content-muted/60 sm:min-h-8">
                            <Check
                                size={15}
                                aria-hidden
                                className="shrink-0 text-brand"
                            />
                            {step.label}
                            <span className="sr-only">(done)</span>
                        </span>
                    ) : (
                        <Link
                            to={step.to}
                            onClick={onNavigate}
                            role="menuitem"
                            className={cn(ITEM, "sm:min-h-8 sm:py-1.5")}
                        >
                            <span
                                aria-hidden
                                className="size-[15px] shrink-0 rounded-full border-[1.5px] border-strong"
                            />
                            {step.label}
                        </Link>
                    )}
                </li>
            ))}
        </ul>
    </>
);

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
                <span className="min-w-0 flex-1">Set up your profile</span>
                <span className="font-mono text-label text-content-muted">
                    {done}/{steps.length}
                </span>
                {isPhone ? (
                    <ChevronDown
                        size={14}
                        aria-hidden
                        className={cn(
                            "shrink-0 text-content-muted transition-transform duration-200",
                            open && "rotate-180"
                        )}
                    />
                ) : (
                    <ChevronLeft
                        size={14}
                        aria-hidden
                        className="shrink-0 text-content-muted"
                    />
                )}
            </button>

            {open &&
                (isPhone ? (
                    <div role="menu" aria-label="Profile setup">
                        <SetupSteps
                            steps={steps}
                            done={done}
                            onNavigate={onNavigate}
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
    const setupDone = setup ? setup.filter((step) => step.done).length : 0;
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme } = useTheme();

    useDismiss([wrapRef], () => setOpen(false), {
        enabled: open,
        escape: true,
    });

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label={
                    setup
                        ? `Account menu, profile setup ${setupDone} of ${setup.length} done`
                        : "Account menu"
                }
                className={cn(
                    "relative block rounded-full ring-offset-2 ring-offset-surface transition-shadow lift",
                    "before:absolute before:-inset-1 before:content-[''] sm:before:hidden",
                    // The setup ring sits where the focus ring would.
                    setup
                        ? null
                        : open
                          ? "ring-2 ring-brand"
                          : "hover:ring-2 hover:ring-subtle"
                )}
            >
                {setup && <SetupRing share={setupDone / setup.length} />}
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
                        "absolute top-[calc(100%+0.6rem)] right-0 z-40 w-60 p-1.5",
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
