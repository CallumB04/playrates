import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import OverviewPage from "./overview/OverviewPage";
import ActivityPage from "./activity/ActivityPage";
import UsersPage from "./users/UsersPage";
import ReportsPage from "./reports/ReportsPage";
import GamesPage from "./games/GamesPage";
import AnnouncementsPage from "./announcements/AnnouncementsPage";
import EmailsPage from "./emails/EmailsPage";
import HealthPage from "./health/HealthPage";
import ProgressAdminPage from "./progress/ProgressAdminPage";
import DesignLibraryPage from "./design-library/DesignLibraryPage";

/** Everything under /admin, loaded as one chunk behind AdminGate. */
const AdminApp = () => (
    <Routes>
        <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="emails" element={<EmailsPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="progress" element={<ProgressAdminPage />} />
            <Route path="design" element={<DesignLibraryPage />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>
    </Routes>
);

export default AdminApp;
