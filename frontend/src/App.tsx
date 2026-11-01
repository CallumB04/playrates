import { lazy, Suspense, useEffect, useRef } from "react";
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
import { useReloadOnNewBuild } from "./hooks/useReloadOnNewBuild";
import { useScrollMemory } from "./hooks/useScrollMemory";
import ErrorBoundary from "./components/feedback/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

/* Each page is its own chunk, so a visitor downloads the page they landed
   on rather than the whole app. A chunk gone missing after a deploy is
   caught by the ErrorBoundary, which loads the new build. */
const ProgressPage = lazy(() => import("./pages/ProgressPage/ProgressPage"));
const ShopPage = lazy(() => import("./pages/ShopPage/ShopPage"));
const HomePage = lazy(() => import("./pages/HomePage/HomePage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage/CommunityPage"));
const NewThreadPage = lazy(() => import("./pages/CommunityPage/NewThreadPage"));
const ThreadPage = lazy(() => import("./pages/CommunityPage/ThreadPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const ContactPage = lazy(() => import("./pages/legal/ContactPage"));
const ProfilePageRoute = lazy(
    () => import("./pages/ProfilePage/ProfilePageRoute")
);
const ListPage = lazy(() => import("./pages/ListPage/ListPage"));
const Gaming25Page = lazy(() => import("./pages/Gaming25Page/Gaming25Page"));
const LibraryPage = lazy(() => import("./pages/LibraryPage/LibraryPage"));
const GamePage = lazy(() => import("./pages/GamePage/GamePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const AdminGate = lazy(() => import("./pages/admin/AdminGate"));
const HubPage = lazy(() => import("./pages/HubPage/HubPage"));
const PeoplePage = lazy(() => import("./pages/PeoplePage/PeoplePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

/** Layout shell and route table. State lives in the providers. */

// /catalogue was the old name. Keep the query string: the filters live there.
const LibraryRedirect = () => {
    const { search } = useLocation();
    return <Navigate to={{ pathname: "/library", search }} replace />;
};

/* A page's chunk is small and usually cached, so this is seldom seen for
   long. Empty, and tall enough that the footer doesn't flash up into view. */
const PageLoading = () => <div aria-busy className="min-h-[60dvh]" />;

function App() {
    useReloadOnNewBuild();
    // A crash on one page shouldn't take the header and the nav with it.
    // Keyed to the page, so going somewhere else starts afresh.
    const { pathname } = useLocation();
    useScrollMemory();

    /* A new page takes focus, so a screen reader reads it and Tab starts
       from its top, as on a site where every link loads a page. Not on the
       first load, where the browser does that itself. */
    const mainRef = useRef<HTMLElement>(null);
    const firstPath = useRef(pathname);
    useEffect(() => {
        if (pathname === firstPath.current) return;
        firstPath.current = "";
        mainRef.current?.focus({ preventScroll: true });
    }, [pathname]);

    return (
        // Below lg the page ends above the tab bar, footer included.
        <div className="flex min-h-dvh flex-col max-lg:pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))]">
            {/* First thing a keyboard reaches: past the header and its menus. */}
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-sm focus:bg-surface-raised focus:px-4 focus:py-2.5 focus:text-body-sm focus:font-medium focus:text-content focus:shadow-plate"
            >
                Skip to content
            </a>
            <Header />
            {/* A full screen at least, so a short page (an empty community, a
                search with no results) doesn't end on the footer. */}
            <main
                id="main"
                ref={mainRef}
                tabIndex={-1}
                className="min-h-dvh flex-1 outline-none"
            >
                <PageShell>
                    <InviteBanner />
                    <ErrorBoundary key={pathname}>
                        <Suspense fallback={<PageLoading />}>
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
                                <Route
                                    path="/library"
                                    element={<LibraryPage />}
                                />
                                <Route
                                    path="/progress"
                                    element={<ProgressPage />}
                                />
                                <Route path="/shop" element={<ShopPage />} />
                                {/* The page was briefly called both things. Kept so
                            shared links and bookmarks still land. */}
                                <Route
                                    path="/catalogue"
                                    element={<LibraryRedirect />}
                                />
                                <Route
                                    path="/game/:gameID"
                                    element={<GamePage />}
                                />
                                <Route
                                    path="/game/:gameID/similar"
                                    element={<HubPage kind="similar" />}
                                />
                                <Route
                                    path="/games/best/:year"
                                    element={<HubPage kind="year" />}
                                />
                                <Route
                                    path="/games/genre/:slug"
                                    element={<HubPage kind="genre" />}
                                />
                                <Route
                                    path="/games/platform/:slug"
                                    element={<HubPage kind="platform" />}
                                />
                                <Route
                                    path="/games/upcoming"
                                    element={<HubPage kind="upcoming" />}
                                />
                                <Route
                                    path="/people"
                                    element={<PeoplePage />}
                                />
                                <Route
                                    path="/community"
                                    element={<CommunityPage />}
                                />
                                <Route
                                    path="/community/new"
                                    element={<NewThreadPage />}
                                />
                                <Route
                                    path="/community/thread/:threadId"
                                    element={<ThreadPage />}
                                />
                                <Route
                                    path="/settings"
                                    element={<SettingsPage />}
                                />
                                <Route
                                    path="/reset-password"
                                    element={<ResetPasswordPage />}
                                />
                                <Route
                                    path="/unsubscribe"
                                    element={<UnsubscribePage />}
                                />

                                {/* Stubs, so the footer never links into nothing. */}
                                <Route
                                    path="/privacy"
                                    element={<PrivacyPage />}
                                />
                                <Route path="/terms" element={<TermsPage />} />
                                <Route
                                    path="/contact"
                                    element={<ContactPage />}
                                />

                                <Route
                                    path="/admin/*"
                                    element={<AdminGate />}
                                />

                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
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
            {/* Visits and Core Web Vitals, cookieless, from the site's own
                origin. They record nothing until switched on in Vercel. */}
            <Analytics />
            <SpeedInsights />
            <ToastStack />
        </div>
    );
}

export default App;
