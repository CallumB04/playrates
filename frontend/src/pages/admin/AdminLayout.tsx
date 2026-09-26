import {
    Activity,
    Gamepad2,
    HeartPulse,
    LayoutDashboard,
    Megaphone,
    SwatchBook,
    Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../../components/ui/ThemeToggle";

/** Add a view by adding an entry here and a route in AdminApp.tsx. */
const ADMIN_VIEWS = [
    { to: "/admin/overview", label: "Overview", Icon: LayoutDashboard },
    { to: "/admin/activity", label: "Activity", Icon: Activity },
    { to: "/admin/users", label: "Users", Icon: Users },
    { to: "/admin/games", label: "Games", Icon: Gamepad2 },
    { to: "/admin/announcements", label: "Announcements", Icon: Megaphone },
    { to: "/admin/health", label: "Health", Icon: HeartPulse },
    { to: "/admin/design", label: "Design library", Icon: SwatchBook },
];

/** Shell for the admin area. Who gets in is AdminGate's decision. */
const AdminLayout = () => (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 font-display lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:h-max lg:w-52">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl font-semibold text-content">Admin</h1>
                <ThemeToggle />
            </div>

            <nav className="-mx-5 flex flex-row gap-1 overflow-x-auto px-5 [contain:layout] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:px-0">
                {ADMIN_VIEWS.map((view) => (
                    <NavLink
                        key={view.to}
                        to={view.to}
                        className={({ isActive }) =>
                            `flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors lg:min-h-0 ${
                                isActive
                                    ? "bg-surface-selected text-brand"
                                    : "text-content-secondary hover:bg-surface-hover hover:text-content"
                            }`
                        }
                    >
                        <view.Icon size={16} aria-hidden />
                        {view.label}
                    </NavLink>
                ))}
            </nav>
        </aside>

        <div className="min-w-0 flex-1">
            <Outlet />
        </div>
    </div>
);

export default AdminLayout;
