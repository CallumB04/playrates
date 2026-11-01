import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
    Activity,
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
import { cn } from "../../lib/cn";
import {
    SwitcherButton,
    SwitcherSheet,
    SwitcherTileBody,
    switcherTileClass,
} from "../../components/ui/SectionSwitcher";

/**
 * Add a view by adding an entry here and a route in AdminApp.tsx.
 *
 * Grouped by what it's for, since eight tabs in a row are eight things to
 * read through: watching the site, its people, and what goes on it.
 */
const ADMIN_GROUPS = [
    [
        { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
        { to: "/admin/activity", label: "Activity", icon: Activity },
        { to: "/admin/health", label: "Health", icon: HeartPulse },
        { to: "/admin/progress", label: "Progress", icon: TrendingUp },
    ],
    [
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/reports", label: "Reports", icon: Flag },
    ],
    [
        { to: "/admin/games", label: "Games", icon: Gamepad2 },
        { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
        { to: "/admin/emails", label: "Emails", icon: Mail },
        { to: "/admin/design", label: "Design library", icon: Palette },
    ],
];
const ADMIN_VIEWS = ADMIN_GROUPS.flat();

/**
 * The admin area wears the profile's drawer tabs rather than a sidebar: it is
 * a handful of views of one site, not an app of its own. Who gets in is
 * AdminGate's decision.
 */
const AdminLayout = () => {
    const { pathname } = useLocation();
    const [sheetOpen, setSheetOpen] = useState(false);
    const current =
        ADMIN_VIEWS.find((v) => pathname.startsWith(v.to)) ?? ADMIN_VIEWS[0]!;
    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-5">
                <div className="flex items-end justify-between gap-4">
                    <h1 className="font-display text-title text-content">
                        Admin
                    </h1>
                    <ThemeToggle />
                </div>

                {/* Ten views don't fit a phone: the profile's switcher
                    there, the grouped row from sm up. */}
                <SwitcherButton
                    icon={current.icon}
                    label={current.label}
                    open={sheetOpen}
                    onOpen={() => setSheetOpen(true)}
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
                                    />
                                </NavLink>
                            </li>
                        ))}
                    </SwitcherSheet>
                )}
                <nav
                    aria-label="Admin"
                    className="hidden items-center gap-1 self-start rounded-md border border-subtle bg-surface-sunken p-1 sm:flex sm:flex-wrap"
                >
                    {ADMIN_GROUPS.map((group, i) => (
                        <div
                            key={i}
                            className="flex shrink-0 items-center gap-1"
                        >
                            {i > 0 && (
                                <span
                                    aria-hidden
                                    className="mx-1 hidden h-5 border-l border-subtle sm:block"
                                />
                            )}
                            {group.map((view) => (
                                <NavLink
                                    key={view.to}
                                    to={view.to}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex min-h-11 shrink-0 items-center rounded-sm px-3.5 py-2 text-body-sm whitespace-nowrap lift sm:min-h-0",
                                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                            isActive
                                                ? "bg-surface-raised font-medium text-content"
                                                : "text-content-secondary hover:text-content"
                                        )
                                    }
                                >
                                    {view.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
            </header>

            <div className="min-w-0">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
