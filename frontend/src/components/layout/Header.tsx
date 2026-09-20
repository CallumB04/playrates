import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Search, Settings, User, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button, { buttonClass } from "../ui/Button";
import ThemeToggle from "../ui/ThemeToggle";
import ProfilePicture from "../ProfilePicture";
import { cn } from "../../lib/cn";

const NAV_LINK =
    "lift border-b-2 pb-1 text-label transition-colors";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        NAV_LINK,
        isActive
            ? "border-b-brand text-content"
            : "border-b-transparent text-content-secondary hover:text-content"
    );

/**
 * Static, not fixed. The mockups put the masthead at the top of the sheet
 * above a double rule, so the page scrolls away from it like a printed page
 * rather than sliding under a bar.
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

    /* "/" focuses search, as the chip in the field advertises. */
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
            const target = event.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
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

    const links = user
        ? [
              { to: "/", label: "Home", end: true },
              { to: "/library", label: "Library", end: false },
              { to: `/user/${user.username}?type=backlog`, label: "Backlog", end: false },
              { to: "/friends", label: "Friends", end: false },
          ]
        : [
              { to: "/", label: "Home", end: true },
              { to: "/library", label: "Library", end: false },
          ];

    return (
        <header className="mx-auto w-full max-w-[1240px] px-5 pt-6 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between gap-6 border-b border-subtle pb-3.5">
                <div className="flex items-baseline gap-8">
                    <Link
                        to="/"
                        className="font-display text-2xl font-bold text-content"
                    >
                        PlayRates
                    </Link>
                    <nav className="hidden items-center gap-6 lg:flex">
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.end}
                                className={navLinkClass}
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-5">
                    {/* A ruled line, not a filled field — the chrome is ink
                        and rule, and a box here would read as a control. */}
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

                    <ThemeToggle className="hidden sm:inline-flex" />

                    {user ? (
                        <Link to={`/user/${user.username}`} aria-label="Your profile">
                            <ProfilePicture
                                variant="nav"
                                file={user.avatarUrl ?? ""}
                                username={user.username}
                                link={false}
                            />
                        </Link>
                    ) : (
                        <div className="hidden items-center gap-3 sm:flex">
                            <Button variant="ghost" size="sm" onClick={openLogin}>
                                Sign in
                            </Button>
                            <Button size="sm" onClick={openSignup}>
                                Start your library
                            </Button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        className="lift -mr-1 p-1 text-content lg:hidden"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <nav className="flex flex-col rounded-b-lg border border-t-0 border-subtle bg-surface-raised shadow-plate lg:hidden">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className="border-b border-subtle px-4 py-3.5 text-label text-content"
                        >
                            {link.label}
                        </NavLink>
                    ))}

                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <ThemeToggle />
                        {user ? (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/settings"
                                    className={buttonClass("secondary", undefined, "sm")}
                                >
                                    <Settings size={14} aria-hidden /> Settings
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void signOut()}
                                >
                                    <LogOut size={14} aria-hidden /> Sign out
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={openLogin}>
                                    <User size={14} aria-hidden /> Sign in
                                </Button>
                                <Button size="sm" onClick={openSignup}>
                                    Start
                                </Button>
                            </div>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
};

export default Header;
