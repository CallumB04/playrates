import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

export interface TileAction {
    key: "view" | "edit" | "add" | "myLog" | "delete";
    label: string;
    icon: string;
    onSelect: () => void;
    tone?: "default" | "danger";
}

type TileVariant = "library" | "profile";

interface VariantConfig {
    /** Optional wrapper around the link; Library centres its tiles in a cell. */
    wrapperClassName?: string;
    linkClassName: string;
    /** Library uses no max-height on its hover menu, Profile does. */
    menuHeight: Record<number, string>;
    rowHeight: Record<number, string>;
}

const VARIANTS: Record<TileVariant, VariantConfig> = {
    library: {
        wrapperClassName: "flex justify-center lg:w-full",
        linkClassName:
            "game-cover group relative h-[180px] w-[135px] p-1 lg:h-[140px] lg:w-[105px]",
        menuHeight: {
            1: "h-1/4 min-h-8",
            2: "h-1/2 min-h-16",
        },
        rowHeight: { 1: "h-full", 2: "h-1/2" },
    },
    profile: {
        linkClassName:
            "game-cover group relative w-1/3 p-1 sm:w-1/4 md:w-[14%] xl:w-[11%]",
        menuHeight: {
            1: "h-1/4 max-h-12 min-h-8",
            2: "h-1/2 max-h-20 min-h-16",
            3: "h-3/4 max-h-28 min-h-24",
        },
        rowHeight: { 1: "h-full", 2: "h-1/2", 3: "h-1/3" },
    },
};

interface GameTileProps {
    gameId: number;
    title: string;
    coverUrl: string | null;
    variant: TileVariant;
    actions: TileAction[];
    /** Hides the ellipsis entirely; the library does this when logged out. */
    showMenu: boolean;
    /** Closes any open hover menu while a popup is on screen. */
    popupIsVisible: boolean;
}

/**
 * One tile replacing the near-identical GameElement components that lived
 * under LibraryPage and ProfilePage. They differed only in sizing, the wrapper
 * element, and which actions were available.
 */
const GameTile = ({
    gameId,
    title,
    coverUrl,
    variant,
    actions,
    showMenu,
    popupIsVisible,
}: GameTileProps) => {
    const [hoveringIcon, setHoveringIcon] = useState(false);
    const [hoveringMenu, setHoveringMenu] = useState(false);

    useEffect(() => {
        if (popupIsVisible) {
            setHoveringIcon(false);
            setHoveringMenu(false);
        }
    }, [popupIsVisible]);

    const config = VARIANTS[variant];
    const count = actions.length;
    const menuOpen =
        (hoveringIcon || hoveringMenu) &&
        !popupIsVisible &&
        showMenu &&
        count > 0;

    const rowHeight = config.rowHeight[count] ?? "h-full";

    const tile = (
        <Link to={`/game/${gameId}`} className={config.linkClassName}>
            <img
                className="h-full w-full rounded-md object-cover"
                src={coverUrl ?? ""}
                alt={title}
            />
            <div className="absolute left-0 top-0 h-full w-full p-1">
                {/* Hover menu, lg and above */}
                <div className="hidden h-full w-full items-center justify-center rounded-md transition-colors duration-200 group-hover:bg-overlay-tile lg:flex">
                    <p className="relative line-clamp-3 break-words px-1 text-center font-lexend text-lg text-content opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:text-base lg:text-sm 2xl:text-base">
                        {title}
                    </p>

                    {showMenu && count > 0 && (
                        <i
                            className="fas fa-ellipsis absolute right-0 top-0 pl-2 pr-3 pt-1 text-lg text-content opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            onMouseOver={() => setHoveringIcon(true)}
                            onMouseOut={() => setHoveringIcon(false)}
                        ></i>
                    )}

                    {menuOpen && (
                        <div
                            className={cn(
                                "hover-menu fade-in-left absolute right-8 top-2 w-full min-w-24 text-center text-sm",
                                config.menuHeight[count],
                                variant === "profile" && "max-w-28"
                            )}
                            onMouseOver={() => setHoveringMenu(true)}
                            onMouseOut={() => setHoveringMenu(false)}
                        >
                            {actions.map((action, index) => (
                                <span
                                    key={action.key}
                                    className={cn(
                                        "flex w-full items-center justify-center gap-2 transition-colors duration-200",
                                        rowHeight,
                                        index === 0 ? "rounded-t" : "rounded-b",
                                        index > 0 && "border-t border-t-faint",
                                        action.tone === "danger"
                                            ? "hover-text-danger"
                                            : "hover:text-brand"
                                    )}
                                    onClick={(e) => {
                                        e.preventDefault(); // prevent Link from triggering
                                        action.onSelect();
                                    }}
                                >
                                    <p>{action.label}</p>
                                    <i className={action.icon}></i>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* icon bar for smaller devices */}
                {showMenu && count > 0 && (
                    <div className="relative flex h-full w-full items-end justify-center p-1.5 lg:hidden">
                        <span
                            className={cn(
                                "flex h-1/5 rounded bg-overlay-chip",
                                count === 1 ? "w-1/3" : "w-2/3"
                            )}
                        >
                            {actions.map((action) => (
                                <span
                                    key={action.key}
                                    className={cn(
                                        "flex h-full items-center justify-center text-content-secondary hover:text-brand",
                                        count === 1 ? "w-full" : `w-1/${count}`
                                    )}
                                    style={{ width: `${100 / count}%` }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        action.onSelect();
                                    }}
                                >
                                    <i
                                        className={action.icon}
                                        title={action.label}
                                    ></i>
                                </span>
                            ))}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );

    return config.wrapperClassName ? (
        <div className={config.wrapperClassName}>{tile}</div>
    ) : (
        tile
    );
};

export default GameTile;
