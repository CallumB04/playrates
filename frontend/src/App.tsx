import "./styles/App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Notification from "./components/Notification";
import AccountFormModal from "./components/auth/AccountFormModal";
import HomePage from "./pages/HomePage/HomePage";
import ProfilePageRoute from "./pages/ProfilePage/ProfilePageRoute";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import GamePage from "./pages/GamePage/GamePage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DesignLibraryPage from "./pages/admin/design-library/DesignLibraryPage";

/**
 * Down from 251 lines. Auth state, notification state, the account-form
 * visibility flags and four exported non-component helpers have all moved to
 * contexts and src/constants — which also stops this file tripping the
 * react-refresh rule about mixing components and constants.
 */
function App() {
    return (
        <>
            <Navbar />
            <main className="px-4 py-20 sm:px-8">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                        path="/user/:targetUsername?"
                        element={<ProfilePageRoute />}
                    />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/game/:gameID" element={<GamePage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Admin area. Built for several views; the design
                        library is the first. */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route
                            index
                            element={<Navigate to="/admin/design" replace />}
                        />
                        <Route path="design" element={<DesignLibraryPage />} />
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
            <Footer />
            <AccountFormModal />
            <Notification />
        </>
    );
}

export default App;
