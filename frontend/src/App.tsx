import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import PageShell from "./components/layout/PageShell";
import Footer from "./components/Footer";
import Notification from "./components/Notification";
import AccountFormModal from "./components/auth/AccountFormModal";
import HomePage from "./pages/HomePage/HomePage";
import ProfilePageRoute from "./pages/ProfilePage/ProfilePageRoute";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import GamePage from "./pages/GamePage/GamePage";
import FriendsPage from "./pages/FriendsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DesignLibraryPage from "./pages/admin/design-library/DesignLibraryPage";

/** Layout shell and route table. State lives in the providers. */
/**
 * The catalogue used to live at /library. A bare redirect would drop the
 * query string, and every shared link carries its filters there.
 */
const CatalogueRedirect = () => {
    const { search } = useLocation();
    return <Navigate to={{ pathname: "/catalogue", search }} replace />;
};

function App() {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
                <PageShell>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route
                            path="/user/:targetUsername?"
                            element={<ProfilePageRoute />}
                        />
                        <Route
                            path="/catalogue"
                            element={<LibraryPage />}
                        />
                        {/* The page was called both things. Kept so shared
                            links and bookmarks still land. */}
                        <Route
                            path="/library"
                            element={<CatalogueRedirect />}
                        />
                        <Route path="/game/:gameID" element={<GamePage />} />
                        <Route path="/friends" element={<FriendsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />

                        {/* Admin area. Built for several views; the design
                            library is the first. */}
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route
                                index
                                element={<Navigate to="/admin/design" replace />}
                            />
                            <Route
                                path="design"
                                element={<DesignLibraryPage />}
                            />
                        </Route>

                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </PageShell>
            </main>
            <Footer />
            <AccountFormModal />
            <Notification />
        </div>
    );
}

export default App;
