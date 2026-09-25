import { SwatchBook } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { TextSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import NotFoundPage from "../NotFoundPage";

/** Add a view by adding an entry here and a route in App.tsx. */
const ADMIN_VIEWS = [
    {
        to: "/admin/design",
        label: "Design library",
        Icon: SwatchBook,
    },
];

/**
 * Shell for the admin area. Anyone else gets the not-found page rather than
 * a refusal, which would confirm there is something here. The page is only
 * furniture; anything an admin can change is checked again by the API.
 */
const AdminLayout = () => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <TextSkeleton lines={4} />;
    if (!user?.isAdmin) return <NotFoundPage />;

    return (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 font-display lg:flex-row">
            <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:h-max lg:w-60">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-xl font-semibold text-content">
                        Admin
                    </h1>
                    <ThemeToggle />
                </div>

                <nav className="flex flex-row gap-1 overflow-x-auto [contain:layout] lg:flex-col">
                    {ADMIN_VIEWS.map((view) => (
                        <NavLink
                            key={view.to}
                            to={view.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
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
};

export default AdminLayout;
