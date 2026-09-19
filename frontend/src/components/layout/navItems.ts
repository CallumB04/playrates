import type { Profile } from "@playrates/shared";
import { getIconFromGameStatus } from "../../constants/gameStatus";

export type NavMenu = "desktop" | "mobile";

export interface NavItem {
    key: string;
    label: string;
    icon: string;
    to?: string;
    action?: "signOut" | "login" | "signup";
    /**
     * Which menus this item belongs to. Not every item is in both: "Browse
     * Games" sits in the mobile menu but is a separate top-level link on
     * desktop, and login/signup are top-level buttons there too.
     */
    menus?: NavMenu[];
    /**
     * Per-item spacing overrides, kept per menu so both stay pixel-identical
     * to the hand-written versions they replace.
     */
    desktopClassName?: string;
    mobileClassName?: string;
}

/** A visual divider between groups. */
export const NAV_DIVIDER = "divider" as const;

export type NavEntry = NavItem | typeof NAV_DIVIDER;

/**
 * The navbar previously wrote its whole link set out twice — once for the
 * desktop dropdown and once for the mobile menu — with different class
 * strings. Both now render from this.
 */
export const buildNavItems = (user: Profile | null): NavEntry[] => {
    const home: NavItem = {
        key: "home",
        label: "Home",
        icon: "fas fa-house",
        to: "/",
        desktopClassName: "mt-3 pl-[6px]",
        mobileClassName: "gap-[11px] pl-[6px]",
    };

    if (!user) {
        // desktop has no dropdown when logged out; these are mobile-only
        return [
            { ...home, menus: ["mobile"] },
            {
                key: "library",
                label: "Browse Games",
                icon: "fas fa-magnifying-glass",
                to: "/library",
                menus: ["mobile"],
            },
            {
                key: "login",
                label: "Log In",
                icon: "fas fa-sign-in-alt",
                action: "login",
                menus: ["mobile"],
            },
            {
                key: "signup",
                label: "Sign Up",
                icon: "fas fa-user-plus",
                action: "signup",
                menus: ["mobile"],
                mobileClassName: "gap-[8px]",
            },
        ];
    }

    const statusItem = (
        status: "played" | "playing" | "backlog" | "wishlist",
        label: string
    ): NavItem => ({
        key: status,
        label,
        icon: getIconFromGameStatus(status) ?? "",
        to: `/user/${user.username}?type=${status}`,
    });

    return [
        home,
        {
            key: "profile",
            label: "My Profile",
            icon: "fa-solid fa-user",
            to: `/user/${user.username}`,
            desktopClassName: "gap-[10px] pl-2",
            mobileClassName: "gap-[14px]",
        },
        {
            key: "library",
            label: "Browse Games",
            icon: "fas fa-magnifying-glass",
            to: "/library",
            // desktop reaches the library from a top-level nav link instead
            menus: ["mobile"],
        },
        NAV_DIVIDER,
        statusItem("played", "Played"),
        statusItem("playing", "Playing"),
        statusItem("backlog", "Backlog"),
        statusItem("wishlist", "Wishlist"),
        NAV_DIVIDER,
        {
            key: "settings",
            label: "Settings",
            icon: "fa-solid fa-cog",
            to: "/settings",
        },
        {
            key: "signout",
            label: "Sign Out",
            icon: "fa-solid fa-right-from-bracket",
            to: "/",
            action: "signOut",
        },
    ];
};
