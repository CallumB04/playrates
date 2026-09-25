import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button from "../ui/Button";
import AccountMenu from "./AccountMenu";
import NotificationMenu from "./NotificationMenu";
import GlobalSearch from "./GlobalSearch";
import MobileMenu, { type NavItem } from "./MobileMenu";
import MobileSearch from "./MobileSearch";
import { cn } from "../../lib/cn";

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

/** Sticky on a phone, where it carries the only route to nav and search;
 *  static from `lg`, where the page scrolls away from the masthead. */
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
    useEffect(() => {
        if (!menuOpen) return;
        const wide = window.matchMedia("(min-width: 1024px)");
        const close = () => wide.matches && setMenuOpen(false);
        close();
        wide.addEventListener("change", close);
        return () => wide.removeEventListener("change", close);
    }, [menuOpen]);

    /* Same for the search overlay, which gives way at `xl`. */
    useEffect(() => {
        if (!searchOpen) return;
        const wide = window.matchMedia("(min-width: 1280px)");
        const close = () => wide.matches && setSearchOpen(false);
        close();
        wide.addEventListener("change", close);
        return () => wide.removeEventListener("change", close);
    }, [searchOpen]);

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
            <header className="sticky top-0 z-40 mx-auto w-full max-w-[1240px] bg-surface px-5 pt-6 sm:px-8 lg:static lg:px-12">
                <div className="flex items-center justify-between gap-6 border-b border-subtle pb-3.5">
                    <div className="flex items-center gap-3 sm:gap-4 lg:gap-8">
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

                    <div className="flex items-center gap-1 sm:gap-4">
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
                            <div className="hidden items-center gap-3 sm:flex">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={openLogin}
                                >
                                    Sign in
                                </Button>
                                <Button size="sm" onClick={openSignup}>
                                    Join PlayRates
                                </Button>
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
