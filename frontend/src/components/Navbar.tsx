import { SearchInput } from "./ui/Input";
import { ChevronDown, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAccountForm } from "../contexts/AccountFormContext";
import { useScrollY } from "../hooks/useScrollY";
import { buildNavItems, NAV_DIVIDER, type NavItem } from "./layout/navItems";
import NavMenuItem from "./layout/NavMenuItem";

const DESKTOP_ITEM_STYLES = `opacity-0 group-hover:opacity-100 transition duration-200
                                        w-11/12 py-1 text-left hover:bg-surface-overlay-hover hover:cursor-pointer rounded-md
                                        flex gap-2 items-center pl-2`;

const MOBILE_ITEM_STYLES = `w-11/12 py-2 text-left text-lg hover:bg-surface-overlay-hover hover:cursor-pointer
                                             rounded-md flex gap-3 items-center pl-2 whitespace-nowrap`;

const Navbar = () => {
    const { user, signOut } = useAuth();
    const { openLogin, openSignup } = useAccountForm();
    const scrollY = useScrollY();
    const location = useLocation();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // scroll to top on navigation; closing the account form is handled by
    // AccountFormProvider rather than here
    useEffect(() => {
        window.scrollTo(0, 0);
        setMobileMenuOpen(false);
    }, [location.pathname, location.search]);

    const handleSelect = useCallback(
        (item: NavItem) => {
            setMobileMenuOpen(false);
            if (item.action === "signOut") void signOut();
            if (item.action === "login") openLogin();
            if (item.action === "signup") openSignup();
        },
        [signOut, openLogin, openSignup]
    );

    const items = buildNavItems(user);

    const renderItems = (variant: "desktop" | "mobile") =>
        items
            .filter(
                (entry) =>
                    entry === NAV_DIVIDER ||
                    (entry.menus ?? ["desktop", "mobile"]).includes(variant)
            )
            .map((entry, index) =>
                entry === NAV_DIVIDER ? (
                    <span
                        key={`divider-${index}`}
                        className={
                            variant === "desktop"
                                ? "my-1 w-11/12 bg-content pt-[1px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                : "my-1 w-11/12 bg-content pt-[1px]"
                        }
                    ></span>
                ) : (
                    <NavMenuItem
                        key={entry.key}
                        item={entry}
                        variant={variant}
                        baseClassName={
                            variant === "desktop"
                                ? DESKTOP_ITEM_STYLES
                                : MOBILE_ITEM_STYLES
                        }
                        onSelect={handleSelect}
                    />
                )
            );

    return (
        <nav
            className={`fixed top-0 left-0 z-50 h-navbar w-screen bg-surface-chrome px-6 xl:px-8 ${scrollY < 50 ? "lg:bg-transparent" : "lg:bg-surface-chrome"} flex items-center justify-center font-display transition-colors duration-300 md:justify-between`}
        >
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <h2 className="font-display text-3xl font-semibold tracking-wide text-content md:text-4xl">
                    PlayRates
                </h2>
            </Link>

            {/* Hamburger, phone screens only */}
            <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                className="group absolute right-5 flex flex-col gap-1 p-[6px] hover:cursor-pointer lg:hidden"
            >
                <div className="h-[2px] w-[22px] bg-content transition-colors group-hover:bg-brand"></div>
                <div className="h-[2px] w-[22px] bg-content transition-colors group-hover:bg-brand"></div>
                <div className="h-[2px] w-[22px] bg-content transition-colors group-hover:bg-brand"></div>
            </button>

            {/* Phone dropdown */}
            <div
                className={`absolute top-navbar right-0 rounded-l-md bg-surface-overlay ${mobileMenuOpen ? "w-9/12" : "w-0"} transition-width flex max-w-80 flex-col items-center gap-2 overflow-x-hidden overflow-y-scroll py-3 text-content delay-50 duration-300 ease-in-out lg:hidden`}
            >
                <span className="relative">
                    <input
                        type="text"
                        placeholder="Search for game..."
                        aria-label="Search for a game"
                        className="h-12 w-[70vw] max-w-[300px] rounded-md bg-surface-field px-2 pr-9 focus:outline-none"
                    />
                    <Search
                        size={20}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-content-muted transition-colors hover:cursor-pointer hover:text-brand"
                        aria-hidden
                    />
                </span>
                {renderItems("mobile")}
            </div>

            {/* Desktop navbar */}
            <div className="hidden h-full items-center gap-4 font-display font-normal text-content lg:flex">
                {user ? (
                    <span className="group relative">
                        <span className="flex items-center gap-1 p-2 group-hover:mt-3 group-hover:pb-5 hover:cursor-pointer">
                            <p className="transition duration-75 group-hover:text-brand">
                                My Account
                            </p>
                            <ChevronDown
                                size={16}
                                className="transition duration-75 group-hover:text-brand"
                                aria-hidden
                            />
                        </span>

                        <div className="transition-height absolute top-[52px] mx-auto h-0 w-60 delay-50 duration-[400ms] ease-in-out group-hover:top-navbar group-hover:block group-hover:h-[315px] hover:block hover:cursor-default">
                            <div className="flex h-full w-full flex-col items-center gap-[2px] overflow-hidden rounded-b-md bg-surface-overlay font-normal">
                                {renderItems("desktop")}
                            </div>
                        </div>
                    </span>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={openLogin}
                            className="block cursor-pointer p-2 text-content transition-colors duration-200 hover:text-brand"
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            onClick={openSignup}
                            className="block cursor-pointer p-2 text-content transition-colors duration-200 hover:text-brand"
                        >
                            Sign up
                        </button>
                    </>
                )}

                <Link to="/library">
                    <p className="block cursor-pointer p-2 text-content transition-colors duration-200 hover:text-brand">
                        Browse Games
                    </p>
                </Link>

                <span className="relative">
                    <SearchInput
                        placeholder="Search for game..."
                        aria-label="Search for a game"
                        className="block w-60 lg:w-72"
                    />
                    <Search
                        size={20}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-content-muted transition-colors hover:cursor-pointer hover:text-brand"
                        aria-hidden
                    />
                </span>
            </div>
        </nav>
    );
};

export default Navbar;
