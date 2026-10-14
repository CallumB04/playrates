import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { cn } from "../../lib/cn";

/**
 * Add a view by adding an entry here and a route in AdminApp.tsx.
 *
 * Grouped by what it's for, since eight tabs in a row are eight things to
 * read through: watching the site, its people, and what goes on it.
 */
const ADMIN_GROUPS = [
    [
        { to: "/admin/overview", label: "Overview" },
        { to: "/admin/activity", label: "Activity" },
        { to: "/admin/health", label: "Health" },
    ],
    [
        { to: "/admin/users", label: "Users" },
        { to: "/admin/reports", label: "Reports" },
    ],
    [
        { to: "/admin/games", label: "Games" },
        { to: "/admin/announcements", label: "Announcements" },
        { to: "/admin/design", label: "Design library" },
    ],
];

/**
 * The admin area wears the profile's drawer tabs rather than a sidebar: it is
 * a handful of views of one site, not an app of its own. Who gets in is
 * AdminGate's decision.
 */
const AdminLayout = () => {
    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-5">
                <div className="flex items-end justify-between gap-4">
                    <h1 className="font-display text-title text-content">
                        Admin
                    </h1>
                    <ThemeToggle />
                </div>

                {/* Wraps rather than scrolls, a group to a line on a phone,
                    so no view is hidden off the edge. */}
                <nav
                    aria-label="Admin"
                    className="flex max-w-full flex-wrap items-center gap-1 self-start rounded-md border border-subtle bg-surface-sunken p-1"
                >
                    {ADMIN_GROUPS.map((group, i) => (
                        <div key={i} className="flex items-center gap-1">
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
