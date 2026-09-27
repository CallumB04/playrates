import { lazy, Suspense } from "react";
import { TextSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import NotFoundPage from "../NotFoundPage";

// Its own chunk, fetched only once the flag says admin: nobody else's
// browser ever downloads the dashboard.
const AdminApp = lazy(() => import("./AdminApp"));

/**
 * Anyone else gets the not-found page rather than a refusal, which would
 * confirm there is something here. This is only furniture; the API checks
 * every admin request again and answers anyone else with a 404 too.
 */
const AdminGate = () => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <TextSkeleton lines={4} />;
    if (!user?.isAdmin) return <NotFoundPage />;

    return (
        <Suspense fallback={<TextSkeleton lines={4} />}>
            <AdminApp />
        </Suspense>
    );
};

export default AdminGate;
