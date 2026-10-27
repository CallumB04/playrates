import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Ellipsis,
    Gamepad2,
    House,
    LogIn,
    MessageSquare,
    type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useSetupSteps } from "../../hooks/useSetupSteps";
import { useSignOut } from "../../hooks/useSignOut";
import { BREAKPOINT, useMediaQuery } from "../../hooks/useMediaQuery";
import { unfinished } from "../../lib/setupChecklist";
import { isCurrent } from "../../lib/navMatch";
import { cn } from "../../lib/cn";
import ProfilePicture from "../ProfilePicture";
import MoreSheet from "./MoreSheet";

const TAB =
    "group relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium transition-colors";

/** The pill behind the icon that marks where you are. */
const Mark = ({
    active,
    children,
}: {
    active: boolean;
    children: ReactNode;
}) => (
    <span
        className={cn(
            "grid h-7 w-14 place-items-center rounded-full transition-colors",
            active
                ? "bg-brand-subtle text-brand"
                : "group-hover:bg-surface-hover"
        )}
    >
        {children}
    </span>
);

const tone = (active: boolean) =>
    active ? "text-content" : "text-content-muted";

/** Again on the tab you are on goes back to the top, as a phone's own apps
 *  do; the link alone would do nothing. */
const toTopIfHere = (active: boolean) => (event: React.MouseEvent) => {
    if (!active) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
};

const NavTab = ({
    to,
    label,
    icon: Icon,
    active,
}: {
    to: string;
    label: string;
    icon: LucideIcon;
    active: boolean;
}) => (
    <Link
        to={to}
        aria-current={active ? "page" : undefined}
        onClick={toTopIfHere(active)}
        className={cn(TAB, tone(active))}
    >
        <Mark active={active}>
            <Icon size={20} strokeWidth={active ? 2.25 : 1.9} aria-hidden />
        </Mark>
        {label}
    </Link>
);

/**
 * The phone and tablet's main navigation, below `lg` where the header has no
 * room for its links. Destinations, not actions, with their words always
 * showing; the rest of what the old menu held is behind More.
 */
const TabBar = () => {
    const { user } = useAuth();
    const { openLogin, openSignup } = useAccountForm();
    const signOut = useSignOut();
    const setup = unfinished(useSetupSteps());
    const { pathname, search } = useLocation();
    const [moreOpen, setMoreOpen] = useState(false);

    useEffect(() => setMoreOpen(false), [pathname, search]);

    /* The bar hides from lg; a sheet left open there would keep its scroll
       lock with nothing on screen to close it. */
    const pastLg = useMediaQuery(BREAKPOINT.lg);
    useEffect(() => {
        if (pastLg) setMoreOpen(false);
    }, [pastLg]);

    const here = (to: string, exact = false) =>
        isCurrent(to, exact, pathname, search);
    const profileTo = user ? `/user/${user.username}` : "";
    // Lit on its views too, not only the profile itself.
    const onProfile = !!user && here(profileTo);
    // The pages only More leads to, so somewhere on the bar is lit.
    const onMore = here("/settings") || here("/admin");

    return (
        <>
            <nav
                aria-label="Main"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-subtle bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
            >
                <div className="mx-auto flex h-tabbar max-w-xl items-stretch px-1">
                    <NavTab
                        to="/"
                        label="Home"
                        icon={House}
                        active={here("/", true)}
                    />
                    <NavTab
                        to="/library"
                        label="Library"
                        icon={Gamepad2}
                        active={here("/library")}
                    />
                    <NavTab
                        to="/community"
                        label="Community"
                        icon={MessageSquare}
                        active={here("/community")}
                    />

                    {user ? (
                        <Link
                            to={profileTo}
                            aria-current={onProfile ? "page" : undefined}
                            onClick={toTopIfHere(onProfile)}
                            className={cn(TAB, tone(onProfile))}
                        >
                            <Mark active={onProfile}>
                                {/* The word says it; the picture's
                                    initial or alt text would be read first. */}
                                <span
                                    aria-hidden
                                    className={cn(
                                        "rounded-full ring-offset-1 ring-offset-surface",
                                        onProfile && "ring-2 ring-brand"
                                    )}
                                >
                                    <ProfilePicture
                                        variant="tab"
                                        file={user.avatarUrl ?? ""}
                                        accent={user.accent}
                                        username={user.username}
                                        link={false}
                                    />
                                </span>
                            </Mark>
                            Profile
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={openLogin}
                            className={cn(TAB, tone(false))}
                        >
                            <Mark active={false}>
                                <LogIn
                                    size={20}
                                    strokeWidth={1.9}
                                    aria-hidden
                                />
                            </Mark>
                            Sign in
                        </button>
                    )}

                    <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-expanded={moreOpen}
                        onClick={() => setMoreOpen(true)}
                        className={cn(TAB, tone(onMore || moreOpen))}
                    >
                        <Mark active={onMore || moreOpen}>
                            <span className="relative">
                                <Ellipsis size={20} aria-hidden />
                                {/* Setup lives in here on a phone; an open
                                    list only pulls if it can be seen. */}
                                {setup && (
                                    <span
                                        aria-hidden
                                        className="absolute -top-0.5 -right-1 size-2 rounded-full bg-brand ring-2 ring-surface"
                                    />
                                )}
                            </span>
                        </Mark>
                        More
                        {setup && (
                            <span className="sr-only">
                                , profile setup unfinished
                            </span>
                        )}
                    </button>
                </div>
            </nav>

            {moreOpen && (
                <MoreSheet
                    user={user}
                    setup={setup}
                    onClose={() => setMoreOpen(false)}
                    onSignIn={openLogin}
                    onSignUp={openSignup}
                    onSignOut={signOut}
                />
            )}
        </>
    );
};

export default TabBar;
