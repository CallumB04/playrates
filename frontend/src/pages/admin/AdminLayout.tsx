import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../../components/ui/ThemeToggle";

/**
 * Shell for the admin area. Only the design library exists today; the nav is
 * a list so adding the next view is one entry rather than a restructure.
 *
 * NOTE: there is no role system yet, so this route is not access-controlled.
 * It renders static component demos and reads no user data, but it should be
 * gated behind an admin role before the app is public.
 */
const ADMIN_VIEWS = [
    {
        to: "/admin/design",
        label: "Design library",
        icon: "fa-solid fa-swatchbook",
    },
];

const AdminLayout = () => (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 font-lexend lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:h-max lg:w-60">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl font-semibold text-content">Admin</h1>
                <ThemeToggle />
            </div>

            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
                {ADMIN_VIEWS.map((view) => (
                    <NavLink
                        key={view.to}
                        to={view.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                                isActive
                                    ? "bg-surface-selected text-brand"
                                    : "text-content-secondary hover:bg-surface-hover hover:text-content"
                            }`
                        }
                    >
                        <i className={view.icon} aria-hidden="true"></i>
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
