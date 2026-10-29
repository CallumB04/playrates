import { useEffect, useState } from "react";
import { env } from "../../lib/env";
import { useSetupSteps } from "../../hooks/useSetupSteps";
import { unfinished } from "../../lib/setupChecklist";
import { Link, useLocation } from "react-router-dom";
import { Database, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button from "../ui/Button";
import AccountMenu from "./AccountMenu";
import NotificationMenu from "./NotificationMenu";
import GlobalSearch from "./GlobalSearch";
import MobileSearch from "./MobileSearch";
import { cn } from "../../lib/cn";
import { isCurrent } from "../../lib/navMatch";
import { useSignOut } from "../../hooks/useSignOut";
import { BREAKPOINT, useMediaQuery } from "../../hooks/useMediaQuery";

/** Stays at the top at every width, translucent so a page's own colours
 *  (a game's art, say) carry up behind it. */
const Header = () => {
    const setup = unfinished(useSetupSteps());
    const { user } = useAuth();
    const handleSignOut = useSignOut();
    const { openLogin, openSignup } = useAccountForm();
    const location = useLocation();

    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        setSearchOpen(false);
    }, [location.pathname, location.search]);

    /* Same for the search overlay, which gives way at `xl`. */
    const pastXl = useMediaQuery(BREAKPOINT.xl);
    useEffect(() => {
        if (pastXl) setSearchOpen(false);
    }, [pastXl]);

    const links = [
        { to: "/", label: "Home", exact: true },
        { to: "/library", label: "Library", exact: false },
        { to: "/community", label: "Community", exact: false },
    ].map(({ to, label, exact }) => ({
        to,
        label,
        active: isCurrent(to, exact, location.pathname, location.search),
    }));

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-subtle bg-surface/75 backdrop-blur-lg">
                <div className="mx-auto flex h-navbar w-full max-w-[1240px] items-center justify-between gap-3 px-5 sm:gap-6 sm:px-8 lg:px-12">
                    <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
                        <Link
                            to="/"
                            className="font-display text-xl font-bold text-content sm:text-2xl"
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

                    {/* Spaced by what is drawn, not by the boxes: each glyph
                        sits inside padding the avatar does not have, so the
                        avatar takes that padding as margin (AccountMenu) and
                        the three read evenly. Phones use 36px boxes with 44px
                        hit areas. From xl search is a field, already even at
                        gap-4. Below lg the bell ends the row, so the row
                        gives back its padding to meet the gutter. */}
                    <div
                        className={cn(
                            "flex items-center gap-2 xl:gap-4",
                            user && "-mr-2 sm:-mr-3 lg:mr-0"
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search"
                            className="relative flex size-9 items-center justify-center rounded-sm text-content lift before:absolute before:-inset-1 before:content-[''] hover:text-brand sm:size-11 sm:before:hidden xl:hidden"
                        >
                            <Search size={20} />
                        </button>

                        <GlobalSearch />

                        {user ? (
                            <>
                                <NotificationMenu />
                                {/* From lg only: below it the bar's Profile
                                    and More tabs hold all of this. */}
                                <span className="hidden lg:contents">
                                    <AccountMenu
                                        user={user}
                                        onSignOut={handleSignOut}
                                        setup={setup}
                                    />
                                </span>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                {/* On a phone too: someone coming back looks
                                    for it top right, not inside the menu.
                                    One button there, so the bar stays
                                    clear; the form it opens leads to
                                    sign-up too. */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={openLogin}
                                    className="max-sm:min-h-11 max-sm:px-3"
                                >
                                    <span className="sm:hidden">
                                        Sign in / sign up
                                    </span>
                                    <span className="hidden sm:inline">
                                        Sign in
                                    </span>
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
        </>
    );
};

export default Header;
