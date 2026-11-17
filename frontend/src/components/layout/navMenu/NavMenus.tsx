import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type FocusEvent,
    type KeyboardEvent,
    type PointerEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/cn";
import { isCurrent } from "../../../lib/navMatch";
import { whenIdle } from "../../../lib/whenIdle";
import { BREAKPOINT, useMediaQuery } from "../../../hooks/useMediaQuery";
import { NAV_ITEMS, slideFrom, type NavMenuKey } from "./navMenus";

const loadPanels = () => import("./MenuPanels");
const MenuPanel = lazy(loadPanels);

/* Long enough that a pointer crossing the bar on its way somewhere else
   doesn't open anything, short enough that one that stops does at once. */
const OPEN_MS = 90;
// Room to cross the gap from a link to its menu without it closing.
const CLOSE_MS = 160;

/**
 * The bar's links, each with a menu of where it leads that opens on a
 * resting pointer, or from its arrow by keyboard or touch. One panel serves
 * them all and moves and resizes between them, so going along the bar reads
 * as one menu changing rather than menus coming and going.
 */
const NavMenus = () => {
    const location = useLocation();
    const wide = useMediaQuery(BREAKPOINT.lg);
    const [open, setOpen] = useState<NavMenuKey | null>(null);
    // The last menu shown, kept while the panel fades out.
    const [shown, setShown] = useState<NavMenuKey | null>(null);
    const [slide, setSlide] = useState<"left" | "right" | null>(null);
    const [left, setLeft] = useState(0);
    const [size, setSize] = useState<{ width: number; height: number }>();
    const openTimer = useRef<number>(undefined);
    const closeTimer = useRef<number>(undefined);
    const region = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const triggers = useRef(new Map<NavMenuKey, HTMLDivElement>());

    useEffect(() => {
        if (!wide) return;
        return whenIdle(() => void loadPanels());
    }, [wide]);

    const clearTimers = () => {
        window.clearTimeout(openTimer.current);
        window.clearTimeout(closeTimer.current);
    };
    useEffect(() => clearTimers, []);

    const show = useCallback(
        (menu: NavMenuKey) => {
            clearTimers();
            setSlide(open ? slideFrom(open, menu) : null);
            setLeft(triggers.current.get(menu)?.offsetLeft ?? 0);
            setOpen(menu);
            setShown(menu);
        },
        [open]
    );

    const close = useCallback(() => {
        clearTimers();
        setOpen(null);
    }, []);

    useEffect(close, [location.pathname, location.search, close]);

    const hoverOpen = (menu: NavMenuKey | null, e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        clearTimers();
        if (!menu) {
            closeTimer.current = window.setTimeout(close, CLOSE_MS);
        } else if (open) {
            show(menu);
        } else {
            openTimer.current = window.setTimeout(() => show(menu), OPEN_MS);
        }
    };

    const hoverLeave = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        clearTimers();
        closeTimer.current = window.setTimeout(close, CLOSE_MS);
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Escape" || !open) return;
        const was = open;
        close();
        triggers.current.get(was)?.querySelector("button")?.focus();
    };

    const onBlur = (e: FocusEvent) => {
        if (!region.current?.contains(e.relatedTarget as Node | null)) close();
    };

    // Kept inside the window: a wide menu off a link near the middle would
    // otherwise run past the right edge on a narrower screen.
    const shift = (() => {
        const start = region.current?.getBoundingClientRect().left ?? 0;
        const room = window.innerWidth - start - 16 - (size?.width ?? 0);
        return Math.min(left, Math.max(0, room));
    })();

    // The panel takes its contents' size, so it can move between them.
    useLayoutEffect(() => {
        const node = content.current;
        if (!node || !shown) return;
        const measure = () =>
            setSize({ width: node.offsetWidth, height: node.offsetHeight });
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [shown]);

    return (
        <div
            ref={region}
            onPointerLeave={hoverLeave}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            className="relative hidden self-stretch lg:flex"
        >
            <nav aria-label="Main" className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                    const active = isCurrent(
                        item.to,
                        item.exact,
                        location.pathname,
                        location.search
                    );
                    const expanded = item.menu !== null && open === item.menu;
                    return (
                        <div
                            key={item.to}
                            ref={(node) => {
                                if (!item.menu) return;
                                if (node) triggers.current.set(item.menu, node);
                                else triggers.current.delete(item.menu);
                            }}
                            onPointerEnter={(e) => hoverOpen(item.menu, e)}
                            className="flex items-center"
                        >
                            {/* The whole item is the link, its arrow too:
                                the menu is for a resting pointer. */}
                            <Link
                                to={item.to}
                                aria-current={active ? "page" : undefined}
                                onKeyDown={(e) => {
                                    if (e.key === "ArrowDown" && item.menu) {
                                        e.preventDefault();
                                        show(item.menu);
                                    }
                                }}
                                className={cn(
                                    "flex h-9 items-center gap-1 rounded-md px-3 text-label transition-colors duration-200",
                                    active
                                        ? "bg-surface-active text-content"
                                        : expanded
                                          ? "bg-surface-hover text-content"
                                          : "text-content-secondary hover:bg-surface-hover hover:text-content"
                                )}
                            >
                                {item.label}
                                {item.menu && (
                                    <ChevronDown
                                        size={14}
                                        strokeWidth={2.25}
                                        aria-hidden
                                        className={cn(
                                            "-mr-0.5 text-content-muted transition-transform duration-200 ease-[var(--ease-glide)] motion-reduce:transition-none",
                                            expanded && "rotate-180"
                                        )}
                                    />
                                )}
                            </Link>
                            {/* For a keyboard or a screen reader: out of
                                sight until it has focus. */}
                            {item.menu && (
                                <button
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-controls="nav-menu"
                                    aria-label={`More in ${item.label}`}
                                    onClick={() =>
                                        expanded ? close() : show(item.menu!)
                                    }
                                    className="sr-only focus-visible:not-sr-only focus-visible:grid focus-visible:size-7 focus-visible:place-items-center focus-visible:rounded-sm focus-visible:text-content-muted"
                                >
                                    <ChevronDown size={14} aria-hidden />
                                </button>
                            )}
                        </div>
                    );
                })}
            </nav>
            {shown && (
                <div
                    id="nav-menu"
                    inert={!open}
                    onPointerEnter={() =>
                        window.clearTimeout(closeTimer.current)
                    }
                    style={{ transform: `translateX(${shift}px)` }}
                    className={cn(
                        "absolute top-full left-0 pt-2 motion-reduce:transition-none",
                        // Moving between menus glides; a fresh one just
                        // appears where it belongs.
                        slide &&
                            "transition-transform duration-300 ease-[var(--ease-glide)]",
                        !open && "pointer-events-none"
                    )}
                >
                    <div
                        style={size}
                        className={cn(
                            "relative origin-top-left overflow-hidden rounded-lg border border-subtle bg-surface-raised shadow-modal duration-300 ease-[var(--ease-glide)] motion-reduce:transition-none",
                            slide
                                ? "transition-[opacity,scale,translate,width,height]"
                                : "transition-[opacity,scale,translate]",
                            open
                                ? "translate-y-0 scale-100 opacity-100"
                                : "-translate-y-1 scale-[0.98] opacity-0"
                        )}
                    >
                        <div
                            ref={content}
                            key={shown}
                            className={cn(
                                "absolute top-0 left-0 w-max py-2 pr-4 pl-2",
                                slide === "right" && "animate-fade-in-left",
                                slide === "left" && "animate-fade-in-right"
                            )}
                        >
                            <Suspense fallback={null}>
                                <MenuPanel menu={shown} onNavigate={close} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NavMenus;
