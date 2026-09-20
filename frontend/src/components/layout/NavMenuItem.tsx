import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import type { NavItem } from "./navItems";

interface NavMenuItemProps {
    item: NavItem;
    /** Shared styles for the menu this item belongs to. */
    baseClassName: string;
    /** Which per-menu override to apply. */
    variant: "desktop" | "mobile";
    onSelect: (item: NavItem) => void;
}

const NavMenuItem = ({
    item,
    baseClassName,
    variant,
    onSelect,
}: NavMenuItemProps) => {
    const override =
        variant === "desktop" ? item.desktopClassName : item.mobileClassName;
    const className = cn(baseClassName, override);

    const { Icon } = item;
    const content = (
        <>
            <Icon size={16} className="text-brand" aria-hidden />
            <p>{item.label}</p>
        </>
    );

    // Log in / Sign up open a modal rather than navigating, so they render
    // as buttons
    if (!item.to) {
        return (
            <button
                type="button"
                className={className}
                onClick={() => onSelect(item)}
            >
                {content}
            </button>
        );
    }

    return (
        <Link to={item.to} className={className} onClick={() => onSelect(item)}>
            {content}
        </Link>
    );
};

export default NavMenuItem;
