import { useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
    Activity,
    CalendarDays,
    ChevronDown,
    Flag,
    Gamepad2,
    HeartPulse,
    LayoutDashboard,
    Mail,
    Megaphone,
    Palette,
    TrendingUp,
    Users,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { popoverClass } from "../../components/ui/popover";
import { tagClass } from "../../components/ui/tagClass";
import { cn } from "../../lib/cn";
import { formatCount } from "../../lib/format";
import type { IconComponent } from "../../lib/icons";
import { useDismiss } from "../../hooks/useDismiss";
import { useAdminAttention } from "../../hooks/queries/useAdmin";
import {
    SwitcherButton,
    SwitcherSheet,
    SwitcherTileBody,
} from "../../components/ui/SectionSwitcher";
import { switcherTileClass } from "../../components/ui/switcherTileClass";
import AttentionCount from "./components/AttentionCount";
import {
    attentionBySection,
    waitingElsewhere,
    type AttentionSection,
} from "./lib/attention";

interface AdminView {
    to: string;
    label: string;
    icon: IconComponent;
    /** Where this view's count of things waiting comes from. */
    attention?: AttentionSection;
}

/**
 * Add a view by adding an entry here and a route in AdminApp.tsx.
 *
 * Grouped by what it's for: keeping an eye on the site, then running it.
 * The views opened once in a while sit under More, out of the row.
 */
const ADMIN_GROUPS: AdminView[][] = [
    [
        { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
        {
            to: "/admin/reports",
            label: "Reports",
            icon: Flag,
            attention: "reports",
        },
        {
            to: "/admin/health",
            label: "Health",
            icon: HeartPulse,
            attention: "health",
        },
        { to: "/admin/activity", label: "Activity", icon: Activity },
    ],
    [
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/games", label: "Games", icon: Gamepad2 },
        { to: "/admin/events", label: "Events", icon: CalendarDays },
        {
            to: "/admin/announcements",
            label: "Announcements",
            icon: Megaphone,
            attention: "announcements",
        },
        { to: "/admin/emails", label: "Emails", icon: Mail },
    ],
];
const MORE_VIEWS: AdminView[] = [
    { to: "/admin/progress", label: "Progress", icon: TrendingUp },
    { to: "/admin/design", label: "Design library", icon: Palette },
];
const ADMIN_VIEWS = [...ADMIN_GROUPS.flat(), ...MORE_VIEWS];

const tabClass = (active: boolean) =>
    cn(
        "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-body-sm whitespace-nowrap lift xl:px-3",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
        active
            ? "bg-surface-raised font-medium text-content"
            : "text-content-secondary hover:text-content"
    );

/** The views opened once in a while, kept out of the row. */
const MoreMenu = ({ current }: { current: AdminView }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    useDismiss([wrapRef], () => setOpen(false), {
        enabled: open,
        escape: true,
    });
    const inside = MORE_VIEWS.includes(current);

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((was) => !was)}
                className={tabClass(inside)}
            >
                {inside ? current.label : "More"}
                <ChevronDown
                    size={14}
                    aria-hidden
                    className={cn(
                        "transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>
            {open && (
                <ul
                    className={popoverClass(
                        "absolute top-full right-0 z-20 mt-2 w-48 p-1.5"
                    )}
                >
                    {MORE_VIEWS.map((view) => (
                        <li key={view.to}>
                            <NavLink
                                to={view.to}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                    cn(
                                        "flex min-h-11 items-center gap-2.5 rounded-sm px-2.5 text-body-sm",
                                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                        isActive
                                            ? "bg-surface-hover font-medium text-content"
                                            : "text-content-secondary hover:bg-surface-hover hover:text-content"
                                    )
                                }
                            >
                                <view.icon
                                    size={16}
                                    aria-hidden
                                    className="shrink-0 text-content-muted"
                                />
                                {view.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

/**
 * The admin area wears the profile's drawer tabs rather than a sidebar: it is
 * a handful of views of one site, not an app of its own. Who gets in is
 * AdminGate's decision.
 */
const AdminLayout = () => {
    const { pathname } = useLocation();
    const [sheetOpen, setSheetOpen] = useState(false);
    const { data: attention } = useAdminAttention();
    const counts = attentionBySection(attention);
    const current =
        ADMIN_VIEWS.find((v) => pathname.startsWith(v.to)) ?? ADMIN_VIEWS[0]!;
    const elsewhere = waitingElsewhere(counts, current.attention);

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-5">
                <div className="flex items-end justify-between gap-4">
                    <h1 className="font-display text-title text-content">
                        Admin
                    </h1>
                    <ThemeToggle />
                </div>

                {/* Eleven views don't fit a phone or a tablet: the
                    profile's switcher there, the grouped row from lg. */}
                <SwitcherButton
                    until="lg"
                    icon={current.icon}
                    label={current.label}
                    open={sheetOpen}
                    onOpen={() => setSheetOpen(true)}
                    extra={
                        elsewhere > 0 && (
                            <span className={tagClass("brand", "shrink-0")}>
                                {formatCount(elsewhere)} waiting{" "}
                                <span className="sr-only">elsewhere</span>
                            </span>
                        )
                    }
                />
                {sheetOpen && (
                    <SwitcherSheet
                        title="Admin"
                        titleId="admin-views-title"
                        onClose={() => setSheetOpen(false)}
                    >
                        {ADMIN_VIEWS.map((view) => (
                            <li key={view.to}>
                                <NavLink
                                    to={view.to}
                                    onClick={() => setSheetOpen(false)}
                                    className={switcherTileClass(
                                        view === current
                                    )}
                                >
                                    <SwitcherTileBody
                                        icon={view.icon}
                                        label={view.label}
                                        active={view === current}
                                        note={
                                            view.attention && (
                                                <AttentionCount
                                                    section={view.attention}
                                                    count={
                                                        counts[view.attention]
                                                    }
                                                />
                                            )
                                        }
                                    />
                                </NavLink>
                            </li>
                        ))}
                    </SwitcherSheet>
                )}
                <nav
                    aria-label="Admin"
                    className="hidden items-center gap-1 self-start rounded-md border border-subtle bg-surface-sunken p-1 lg:flex lg:flex-wrap"
                >
                    {ADMIN_GROUPS.map((group, i) => (
                        <div
                            key={i}
                            className="flex shrink-0 items-center gap-1"
                        >
                            {i > 0 && (
                                <span
                                    aria-hidden
                                    className="mx-0.5 h-5 border-l border-subtle xl:mx-1"
                                />
                            )}
                            {group.map((view) => (
                                <NavLink
                                    key={view.to}
                                    to={view.to}
                                    className={({ isActive }) =>
                                        tabClass(isActive)
                                    }
                                >
                                    {view.label}
                                    {view.attention && (
                                        <AttentionCount
                                            section={view.attention}
                                            count={counts[view.attention]}
                                        />
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                    <span
                        aria-hidden
                        className="mx-0.5 h-5 border-l border-subtle xl:mx-1"
                    />
                    <MoreMenu current={current} />
                </nav>
            </header>

            <div className="min-w-0">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
