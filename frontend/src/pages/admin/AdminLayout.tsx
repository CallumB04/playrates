import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useOverflowFade } from "../../hooks/useOverflowFade";
import { cn } from "../../lib/cn";

/** Add a view by adding an entry here and a route in AdminApp.tsx. */
const ADMIN_VIEWS = [
    { to: "/admin/overview", label: "Overview" },
    { to: "/admin/activity", label: "Activity" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/games", label: "Games" },
    { to: "/admin/announcements", label: "Announcements" },
    { to: "/admin/health", label: "Health" },
    { to: "/admin/design", label: "Design library" },
];

/**
 * The admin area wears the profile's drawer tabs rather than a sidebar: it is
 * a handful of views of one site, not an app of its own. Who gets in is
 * AdminGate's decision.
 */
const AdminLayout = () => {
    const fade = useOverflowFade<HTMLElement>();

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-5">
                <div className="flex items-end justify-between gap-4">
                    <h1 className="font-display text-title text-content">
                        Admin
                    </h1>
                    <ThemeToggle />
                </div>

                <nav
                    aria-label="Admin"
                    ref={fade.ref}
                    onScroll={fade.onScroll}
                    style={fade.style}
                    className="flex max-w-full gap-1 self-start overflow-x-auto rounded-md border border-subtle bg-surface-sunken p-1 [contain:layout]"
                >
                    {ADMIN_VIEWS.map((view) => (
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
                </nav>
            </header>

            <div className="min-w-0">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
