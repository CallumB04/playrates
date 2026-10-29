import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import TabBar from "./components/layout/TabBar";
import PageShell from "./components/layout/PageShell";
import Footer from "./components/Footer";
import ToastStack from "./components/feedback/ToastStack";
import AccountFormModal from "./components/auth/AccountFormModal";
import ChooseUsername from "./components/onboarding/ChooseUsername";
import FirstLoginWelcome from "./components/onboarding/FirstLoginWelcome";
import ProgressMoments from "./components/progress/ProgressMoments";
import ReferralCapture from "./components/progress/ReferralCapture";
import AuthLinkResult from "./components/auth/AuthLinkResult";
import InviteBanner from "./components/progress/InviteBanner";
import ProgressPage from "./pages/ProgressPage/ProgressPage";
import ShopPage from "./pages/ShopPage/ShopPage";
import HomePage from "./pages/HomePage/HomePage";
import CommunityPage from "./pages/CommunityPage/CommunityPage";
import NewThreadPage from "./pages/CommunityPage/NewThreadPage";
import ThreadPage from "./pages/CommunityPage/ThreadPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import TermsPage from "./pages/legal/TermsPage";
import ContactPage from "./pages/legal/ContactPage";
import ProfilePageRoute from "./pages/ProfilePage/ProfilePageRoute";
import ListPage from "./pages/ListPage/ListPage";
import Gaming25Page from "./pages/Gaming25Page/Gaming25Page";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import GamePage from "./pages/GamePage/GamePage";
import SettingsPage from "./pages/SettingsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminGate from "./pages/admin/AdminGate";
import { useReloadOnNewBuild } from "./hooks/useReloadOnNewBuild";

/** Layout shell and route table. State lives in the providers. */

// /catalogue was the old name. Keep the query string: the filters live there.
const LibraryRedirect = () => {
    const { search } = useLocation();
    return <Navigate to={{ pathname: "/library", search }} replace />;
};

function App() {
    useReloadOnNewBuild();

    return (
        // Below lg the page ends above the tab bar, footer included.
        <div className="flex min-h-dvh flex-col max-lg:pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))]">
            <Header />
            {/* A full screen at least, so a short page (an empty community, a
                search with no results) doesn't end on the footer. */}
            <main className="min-h-dvh flex-1">
                <PageShell>
                    <InviteBanner />
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route
                            path="/user/:username/lists/:listId"
                            element={<ListPage />}
                        />
                        <Route
                            path="/user/:username/gaming-25"
                            element={<Gaming25Page />}
                        />
                        <Route
                            path="/user/:targetUsername?/:view?"
                            element={<ProfilePageRoute />}
                        />
                        <Route path="/library" element={<LibraryPage />} />
                        <Route path="/progress" element={<ProgressPage />} />
                        <Route path="/shop" element={<ShopPage />} />
                        {/* The page was briefly called both things. Kept so
                            shared links and bookmarks still land. */}
                        <Route
                            path="/catalogue"
                            element={<LibraryRedirect />}
                        />
                        <Route path="/game/:gameID" element={<GamePage />} />
                        <Route path="/community" element={<CommunityPage />} />
                        <Route
                            path="/community/new"
                            element={<NewThreadPage />}
                        />
                        <Route
                            path="/community/thread/:threadId"
                            element={<ThreadPage />}
                        />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route
                            path="/reset-password"
                            element={<ResetPasswordPage />}
                        />

                        {/* Stubs, so the footer never links into nothing. */}
                        <Route path="/privacy" element={<PrivacyPage />} />
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="/contact" element={<ContactPage />} />

                        <Route path="/admin/*" element={<AdminGate />} />

                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </PageShell>
            </main>
            <Footer />
            <TabBar />
            <AccountFormModal />
            <ChooseUsername />
            <FirstLoginWelcome />
            <ProgressMoments />
            <ReferralCapture />
            <AuthLinkResult />
            <ToastStack />
        </div>
    );
}

export default App;
