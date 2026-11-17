import { useEffect, useState } from "react";
import { useSetupSteps } from "../../hooks/useSetupSteps";
import { unfinished } from "../../lib/setupChecklist";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import Skeleton from "../ui/Skeleton";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button from "../ui/Button";
import AccountMenu from "./AccountMenu";
import NavMenus from "./navMenu/NavMenus";
import NotificationMenu from "./NotificationMenu";
import GlobalSearch from "./GlobalSearch";
import MobileSearch from "./MobileSearch";
import { cn } from "../../lib/cn";
import { useSignOut } from "../../hooks/useSignOut";
import { BREAKPOINT, useMediaQuery } from "../../hooks/useMediaQuery";

/** Stays at the top at every width, translucent so a page's own colours
 *  (a game's art, say) carry up behind it. */
const Header = () => {
    const setup = unfinished(useSetupSteps());
    const { user, isLoading } = useAuth();
    const handleSignOut = useSignOut();
    const { openLogin, openSignup } = useAccountForm();
    const location = useLocation();

    const [searchOpen, setSearchOpen] = useState(false);

    // Where the page lands is ScrollRestoration's (AppProviders).
    useEffect(() => {
        setSearchOpen(false);
    }, [location.pathname, location.search]);

    /* Same for the search overlay, which gives way at `xl`. */
    const pastXl = useMediaQuery(BREAKPOINT.xl);
    useEffect(() => {
        if (pastXl) setSearchOpen(false);
    }, [pastXl]);

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-subtle bg-surface/75 backdrop-blur-lg">
                <div className="mx-auto flex h-navbar w-full max-w-[1240px] items-center justify-between gap-3 px-5 sm:gap-6 sm:px-8 lg:px-12">
                    <div className="flex items-center gap-2 self-stretch sm:gap-4 lg:gap-6">
                        <Link
                            to="/"
                            className="font-display text-xl font-bold text-content sm:text-2xl"
                        >
                            PlayRates
                        </Link>
                        <NavMenus />
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
                            className="relative flex size-9 items-center justify-center rounded-sm text-content lift before:absolute before:-inset-1 before:content-[''] hover:text-brand-text sm:size-11 sm:before:hidden xl:hidden"
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
                        ) : isLoading ? (
                            // Signed in but the profile still on its way: a
                            // place for the avatar, not the log-in buttons
                            // of someone who just logged in.
                            <Skeleton round className="size-9" />
                        ) : (
                            <div className="flex items-center gap-3">
                                {/* On a phone too: someone coming back looks
                                    for it top right, not inside the menu.
                                    Only this one there, so the bar stays
                                    simple; the form it opens leads to
                                    sign-up too. */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={openLogin}
                                    className="max-sm:min-h-11 max-sm:px-3"
                                >
                                    Log in
                                </Button>
                                {/* Not on the join pages themselves. */}
                                {!location.pathname.startsWith("/join") && (
                                    <span className="hidden sm:contents">
                                        <Button size="sm" onClick={openSignup}>
                                            Join PlayRates
                                        </Button>
                                    </span>
                                )}
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
