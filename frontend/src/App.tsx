import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import PageShell from "./components/layout/PageShell";
import Footer from "./components/Footer";
import Notification from "./components/Notification";
import AccountFormModal from "./components/auth/AccountFormModal";
import HomePage from "./pages/HomePage/HomePage";
import CommunityPage from "./pages/CommunityPage";
import LegalPage from "./pages/legal/LegalPage";
import ProfilePageRoute from "./pages/ProfilePage/ProfilePageRoute";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import GamePage from "./pages/GamePage/GamePage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DesignLibraryPage from "./pages/admin/design-library/DesignLibraryPage";

/** Layout shell and route table. State lives in the providers. */

const LEGAL_PAGES = [
    {
        path: "/about",
        title: "About PlayRates",
        summary: "What this is, who built it, and why it exists.",
    },
    {
        path: "/privacy",
        title: "Privacy",
        summary: "What we store about you, and what we do with it.",
    },
    {
        path: "/terms",
        title: "Terms",
        summary: "The rules for keeping an account here.",
    },
    {
        path: "/contact",
        title: "Contact",
        summary: "How to reach someone about the site.",
    },
];

// /catalogue was the old name. Keep the query string: the filters live there.
const LibraryRedirect = () => {
    const { search } = useLocation();
    return <Navigate to={{ pathname: "/library", search }} replace />;
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
                        <Route path="/library" element={<LibraryPage />} />
                        {/* The page was briefly called both things. Kept so
                            shared links and bookmarks still land. */}
                        <Route
                            path="/catalogue"
                            element={<LibraryRedirect />}
                        />
                        <Route path="/game/:gameID" element={<GamePage />} />
                        <Route path="/community" element={<CommunityPage />} />
                        <Route path="/settings" element={<SettingsPage />} />

                        {/* Stubs, so the footer never links into nothing. */}
                        {LEGAL_PAGES.map((page) => (
                            <Route
                                key={page.path}
                                path={page.path}
                                element={
                                    <LegalPage
                                        title={page.title}
                                        summary={page.summary}
                                    />
                                }
                            />
                        ))}

                        {/* Admin area. Built for several views; the design
                            library is the first. */}
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route
                                index
                                element={
                                    <Navigate to="/admin/design" replace />
                                }
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
