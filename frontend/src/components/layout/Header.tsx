import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button from "../ui/Button";
import AccountMenu from "./AccountMenu";
import GlobalSearch from "./GlobalSearch";
import MobileMenu, { type NavItem } from "./MobileMenu";
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

/** Static, not fixed — the page scrolls away from the masthead. */
const Header = () => {
    const { user, signOut } = useAuth();
    const { openLogin, openSignup } = useAccountForm();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        setMenuOpen(false);
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
            <header className="mx-auto w-full max-w-[1240px] px-5 pt-6 sm:px-8 lg:px-12">
                <div className="flex items-center justify-between gap-6 border-b border-subtle pb-3.5">
                    <div className="flex items-center gap-3 sm:gap-4 lg:gap-8">
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Open menu"
                            className="-ml-2 rounded-sm p-2 text-content lift hover:text-brand lg:hidden"
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
                                        "border-b-2 pb-1 text-label transition-colors lift",
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
                        <GlobalSearch />

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
