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

    const content = (
        <>
            <i className={`${item.icon} text-brand`} aria-hidden="true"></i>
            <p>{item.label}</p>
        </>
    );

    // Log in / Sign up have no destination, so they are real buttons rather
    // than the clickable <p> elements they used to be
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
