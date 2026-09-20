import type { Profile } from "@playrates/shared";
import {
    Home,
    LogIn,
    LogOut,
    Search,
    Settings,
    User,
    UserPlus,
} from "lucide-react";
import { getStatusIcon, type IconComponent } from "../../lib/icons";

export type NavMenu = "desktop" | "mobile";

export interface NavItem {
    key: string;
    label: string;
    Icon: IconComponent;
    to?: string;
    action?: "signOut" | "login" | "signup";
    /* Which menus this item appears in. Not everything is in both — "Browse
       Games" and login/signup are top-level on desktop. */
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

/** One definition, rendered by both the desktop dropdown and the mobile menu. */
export const buildNavItems = (user: Profile | null): NavEntry[] => {
    const home: NavItem = {
        key: "home",
        label: "Home",
        Icon: Home,
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
                Icon: Search,
                to: "/library",
                menus: ["mobile"],
            },
            {
                key: "login",
                label: "Log In",
                Icon: LogIn,
                action: "login",
                menus: ["mobile"],
            },
            {
                key: "signup",
                label: "Sign Up",
                Icon: UserPlus,
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
        Icon: getStatusIcon(status) ?? Home,
        to: `/user/${user.username}?type=${status}`,
    });

    return [
        home,
        {
            key: "profile",
            label: "My Profile",
            Icon: User,
            to: `/user/${user.username}`,
            desktopClassName: "gap-[10px] pl-2",
            mobileClassName: "gap-[14px]",
        },
        {
            key: "library",
            label: "Browse Games",
            Icon: Search,
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
            Icon: Settings,
            to: "/settings",
        },
        {
            key: "signout",
            label: "Sign Out",
            Icon: LogOut,
            to: "/",
            action: "signOut",
        },
    ];
};
