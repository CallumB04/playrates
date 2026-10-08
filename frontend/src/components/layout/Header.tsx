import { useEffect, useState } from "react";
import { env } from "../../lib/env";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Database, Menu, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button from "../ui/Button";
import AccountMenu from "./AccountMenu";
import NotificationMenu from "./NotificationMenu";
import GlobalSearch from "./GlobalSearch";
import MobileMenu, { type NavItem } from "./MobileMenu";
import MobileSearch from "./MobileSearch";
import { cn } from "../../lib/cn";
import { BREAKPOINT, useMediaQuery } from "../../hooks/useMediaQuery";

/** Whether a nav link points at where we already are. NavLink matches on
 *  pathname only, and some links carry a query string that matters. */
const isCurrent = (
    to: string,
    exact: boolean,
    pathname: string,
    search: string
): boolean => {
    const [path, query] = to.split("?");

    const pathMatches = exact
        ? pathname === path
        : pathname === path || pathname.startsWith(`${path}/`);
    if (!pathMatches) return false;
    if (!query) return true;

    const wanted = new URLSearchParams(query);
    const actual = new URLSearchParams(search);
    return [...wanted].every(([key, value]) => actual.get(key) === value);
};

/** Stays at the top at every width, translucent so a page's own colours
 *  (a game's art, say) carry up behind it. */
const Header = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { openLogin, openSignup } = useAccountForm();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    /* Home, not wherever you were: signing out on a settings page or somebody's
       profile leaves you looking at something you can no longer load. */
    const handleSignOut = () => {
        void signOut();
        navigate("/");
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        setMenuOpen(false);
        setSearchOpen(false);
    }, [location.pathname, location.search]);

    /* Close on the way up past `lg`: the menu hides there, and its scroll lock
       would stay on with nothing left to turn it off. */
    const pastLg = useMediaQuery(BREAKPOINT.lg);
    useEffect(() => {
        if (pastLg) setMenuOpen(false);
    }, [pastLg]);

    /* Same for the search overlay, which gives way at `xl`. */
    const pastXl = useMediaQuery(BREAKPOINT.xl);
    useEffect(() => {
        if (pastXl) setSearchOpen(false);
    }, [pastXl]);

    const links: NavItem[] = (
        user
            ? [
                  { to: "/", label: "Home", exact: true },
                  { to: "/library", label: "Library", exact: false },
                  {
                      to: "/community",
                      label: "Community",
                      exact: false,
                  },
              ]
            : [
                  { to: "/", label: "Home", exact: true },
                  { to: "/library", label: "Library", exact: false },
                  {
                      to: "/community",
                      label: "Community",
                      exact: false,
                  },
              ]
    ).map(({ to, label, exact }) => ({
        to,
        label,
        active: isCurrent(to, exact, location.pathname, location.search),
    }));

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-subtle bg-surface/75 backdrop-blur-lg">
                <div className="mx-auto flex h-navbar w-full max-w-[1240px] items-center justify-between gap-3 px-5 sm:gap-6 sm:px-8 lg:px-12">
                    <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Open menu"
                            className="-ml-[11px] flex size-11 items-center justify-center rounded-sm text-content lift hover:text-brand lg:hidden"
                        >
                            <Menu size={22} />
                        </button>

                        <Link
                            to="/"
                            className="font-display text-2xl font-bold text-content"
                        >
                            PlayRates
                        </Link>
                        {/* So a test run is never mistaken for the live site.
                            An icon on a phone: the word pushed a signed-in
                            header 33px past a 375px screen. */}
                        {env.localData && (
                            <span
                                title="Running against the local database. Nothing here touches live."
                                className="flex items-center rounded-sm border border-dashed border-warning-border px-1 py-0.5 text-[10px] font-semibold tracking-wide text-warning-content uppercase sm:px-1.5"
                            >
                                <Database
                                    size={12}
                                    aria-hidden
                                    className="sm:hidden"
                                />
                                <span className="max-sm:sr-only">Local</span>
                            </span>
                        )}

                        <nav className="hidden items-center gap-6 lg:flex">
                            {links.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    aria-current={
                                        link.active ? "page" : undefined
                                    }
                                    /* The rule is drawn, not padded: a bottom
                                       border plus its padding sat inside the
                                       box, which pushed the word off the
                                       centre line the wordmark sits on. */
                                    className={cn(
                                        "group relative py-1 text-label transition-colors lift",
                                        link.active
                                            ? "text-content"
                                            : "text-content-secondary hover:text-content"
                                    )}
                                >
                                    {link.label}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-center rounded-full transition-transform duration-200 ease-[var(--ease-glide)]",
                                            link.active
                                                ? "scale-x-100 bg-brand"
                                                : "scale-x-0 bg-strong group-hover:scale-x-100"
                                        )}
                                    />
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* No gap on a phone: the 44px boxes already hold the icons
                        24px apart, and a gap here was what pushed the header
                        past a 320px screen. */}
                    <div className="flex items-center sm:gap-4">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search"
                            className="flex size-11 items-center justify-center rounded-sm text-content lift hover:text-brand xl:hidden"
                        >
                            <Search size={20} />
                        </button>

                        <GlobalSearch />

                        {user ? (
                            <>
                                <NotificationMenu />
                                <AccountMenu
                                    user={user}
                                    onSignOut={handleSignOut}
                                />
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                {/* On a phone too: someone coming back looks
                                    for it top right, not inside the menu. */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={openLogin}
                                    className="max-sm:min-h-11 max-sm:px-3"
                                >
                                    Sign in
                                </Button>
                                <span className="hidden sm:contents">
                                    <Button size="sm" onClick={openSignup}>
                                        Join PlayRates
                                    </Button>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {searchOpen && (
                <MobileSearch onClose={() => setSearchOpen(false)} />
            )}

            {menuOpen && (
                <MobileMenu
                    links={links}
                    user={user}
                    onClose={() => setMenuOpen(false)}
                    onSignIn={openLogin}
                    onSignUp={openSignup}
                    onSignOut={handleSignOut}
                />
            )}
        </>
    );
};

export default Header;
