import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button from "../ui/Button";
import AccountMenu from "./AccountMenu";
import MobileMenu, { type NavItem } from "./MobileMenu";
import { cn } from "../../lib/cn";

/**
 * Whether a nav link points at where we already are.
 *
 * `NavLink` can't do this one: the Backlog link carries `?type=backlog`, and
 * NavLink matches on pathname only — so it lit up on every profile page,
 * including other people's.
 */
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

/**
 * Static, not fixed. The page scrolls away from the masthead rather than
 * sliding under a bar.
 */
const Header = () => {
    const { user, signOut } = useAuth();
    const { openLogin, openSignup } = useAccountForm();
    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);
    const [search, setSearch] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        setMenuOpen(false);
    }, [location.pathname, location.search]);

    /* The menu and the button that opens it are both below `lg`. Crossing
       that line with the menu open would hide it while its scroll lock stayed
       on, leaving a page that can't scroll and no way to unlock it. */
    useEffect(() => {
        if (!menuOpen) return;
        const wide = window.matchMedia("(min-width: 1024px)");
        const close = () => wide.matches && setMenuOpen(false);
        close();
        wide.addEventListener("change", close);
        return () => wide.removeEventListener("change", close);
    }, [menuOpen]);

    /* "/" focuses search, as the chip in the field advertises. */
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
            const target = event.target as HTMLElement | null;
            const tag = target?.tagName;
            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                target?.isContentEditable
            ) {
                return;
            }
            event.preventDefault();
            searchRef.current?.focus();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    const submitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        const term = search.trim();
        if (!term) return;
        navigate(`/library?q=${encodeURIComponent(term)}`);
        setSearch("");
        searchRef.current?.blur();
    };

    const links: NavItem[] = (
        user
            ? [
                  { to: "/", label: "Home", exact: true },
                  { to: "/library", label: "Library", exact: false },
                  {
                      to: `/user/${user.username}?type=backlog`,
                      label: "Backlog",
                      exact: false,
                  },
                  { to: "/friends", label: "Friends", exact: false },
              ]
            : [
                  { to: "/", label: "Home", exact: true },
                  { to: "/library", label: "Library", exact: false },
              ]
    ).map(({ to, label, exact }) => ({
        to,
        label,
        active: isCurrent(to, exact, location.pathname, location.search),
    }));

    return (
        <>
            <header className="mx-auto w-full max-w-[1240px] px-5 pt-6 sm:px-8 lg:px-12">
                <div className="flex items-center justify-between gap-6 border-b border-subtle pb-3.5">
                    <div className="flex items-center gap-3 sm:gap-4 lg:gap-8">
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Open menu"
                            className="lift -ml-2 rounded-sm p-2 text-content hover:text-brand lg:hidden"
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
                                    className={cn(
                                        "lift border-b-2 pb-1 text-label transition-colors",
                                        link.active
                                            ? "border-b-brand text-content"
                                            : "border-b-transparent text-content-secondary hover:text-content"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <form
                            onSubmit={submitSearch}
                            className="lift hidden items-center gap-2.5 rounded-sm border border-subtle bg-surface-raised px-3 py-2 hover:border-strong focus-within:border-brand focus-within:shadow-glow xl:flex xl:w-64"
                        >
                            <Search
                                size={12}
                                aria-hidden
                                className="shrink-0 text-content-muted"
                            />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search titles"
                                placeholder="Search titles"
                                className="min-w-0 flex-1 bg-transparent text-body-sm text-content placeholder:text-content-muted focus:outline-none"
                            />
                            <kbd className="rounded-xs border border-subtle px-1.5 font-mono text-[10px] text-content-muted">
                                /
                            </kbd>
                        </form>

                        {user ? (
                            <AccountMenu
                                user={user}
                                onSignOut={() => void signOut()}
                            />
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
                                    Start your library
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {menuOpen && (
                <MobileMenu
                    links={links}
                    user={user}
                    onClose={() => setMenuOpen(false)}
                    onSignIn={openLogin}
                    onSignUp={openSignup}
                    onSignOut={() => void signOut()}
                />
            )}
        </>
    );
};

export default Header;
