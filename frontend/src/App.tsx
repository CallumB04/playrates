import "./styles/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage/HomePage";
import { fetchUserByID, UserAccount } from "./api";
import { createContext, useContext } from "react";
import AccountForm from "./components/AccountForm";
import Notification from "./components/Notification";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import GamePage from "./pages/GamePage/GamePage";

// creating context for user, to be accessed throughout whole application
const UserContext = createContext<UserAccount | null>(null);
export const useUser = () => useContext(UserContext);

export const getColorFromGameStatus = (status: string) => {
    switch (status) {
        case "finished":
            return {
                bg: "bg-[#b19cd933]",
                text: "text-[#b19cd9]",
            };
        case "mastered":
            return {
                bg: "bg-[#a3e9ff33]",
                text: "text-[#a3e9ff]",
            };
        case "shelved":
            return {
                bg: "bg-[#fdfd9633]",
                text: "text-[#fdfd96]",
            };
        case "retired":
            return {
                bg: "bg-[#f01e2c33]",
                text: "text-[#f01e2c]",
            };
        case "playing":
            return {
                bg: "bg-[#bfe1f633]",
                text: "text-[#bfe1f6]",
            };
        case "backlog":
            return {
                bg: "bg-[#ffb34733]",
                text: "text-[#ffb347]",
            };
        case "wishlist":
            return {
                bg: "bg-[#d4edbc33]",
                text: "text-[#d4edbc]",
            };
    }
};

export const getIconFromGameStatus = (status: string) => {
    switch (status) {
        case "played":
            return "fa-regular fa-check-circle";
        case "playing":
            return "fa-regular fa-play-circle";
        case "backlog":
            return "fa-regular fa-calendar-plus";
        case "wishlist":
            return "fa-solid fa-heart";
    }
};

// game platforms and their associated font awesome icons
export const gamePlatforms = [
    { name: "steam", display: "Steam", icon: "fab fa-steam" },
    { name: "pc-game-pass", display: "PC Game Pass", icon: "fab fa-xbox" },
    { name: "xbox", display: "Xbox", icon: "fab fa-xbox" },
    { name: "playstation", display: "Playstation", icon: "fab fa-playstation" },
    {
        name: "nintendo-switch",
        display: "Nintendo Switch",
        icon: "fas fa-gamepad",
    },
    { name: "other-pc", display: "Other PC", icon: "fas fa-desktop" },
    { name: "mobile", display: "Mobile", icon: "fas fa-mobile-screen" },
];

function App() {
    // user account in state
    const [user, setUser] = useState<UserAccount | null>(null);

    // signup / login form visibility
    const [accountFormVisible, setAccountFormVisible] =
        useState<boolean>(false);
    const [currentForm, setCurrentForm] = useState<"signup" | "login">(
        "signup"
    );

    // handling notifications
    const [notificationActive, setNotificationActive] =
        useState<boolean>(false);
    const [notificationText, setNotificationText] = useState<string>("");
    const [notificationType, setNotificationType] = useState<
        "success" | "error" | "pending"
    >("success");

    const runNotification = (
        text: string,
        type: "success" | "error" | "pending"
    ) => {
        setNotificationActive(false); // clearing old notification if two in quick succession
        setTimeout(() => {
            setNotificationText(text);
            setNotificationType(type);
            setNotificationActive(true);
        }, 0);
    };

    // removes notification from DOM when faded out
    useEffect(() => {
        if (notificationActive) {
            const timer = setTimeout(() => {
                setNotificationActive(false);
            }, 7000);
            return () => clearTimeout(timer);
        }
    }, [notificationActive]);

    // functions to open signup / login forms
    const openSignupForm = () => {
        setCurrentForm("signup");
        setAccountFormVisible(true);
    };
    const openLoginForm = () => {
        setCurrentForm("login");
        setAccountFormVisible(true);
    };
    const closeAccountForm = () => setAccountFormVisible(false);

    // fetching user id from localstorage
    // temporary feature for testing to simulate using cookies to remember user
    // will replace in future for security reasons
    useEffect(() => {
        const userTokenLocal: string | null = localStorage.getItem("user_id");
        const userTokenSession: string | null =
            sessionStorage.getItem("user_id");

        // load user from local or session storage if exists
        if (userTokenLocal) {
            loadUserByID(Number(userTokenLocal));
        } else if (userTokenSession) {
            loadUserByID(Number(userTokenSession));
        }
    }, []);

    // function to fetch user account from API and change in state
    // will be passed to login / signup pages
    const loadUserByID = async (id: number) => {
        // fetching user with given ID
        const fetchedUser = await fetchUserByID(id);

        // sets user account in state when fetched
        if (fetchedUser) {
            setUser(fetchedUser);
            runNotification("You are now logged in", "success");
        }
    };

    // function to sign out user
    // will be passed to all components that allow for signing out
    const signOutUser = () => {
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
        runNotification("You have been logged out", "success");
    };

    return (
        <UserContext.Provider value={user}>
            <Router basename="/PlayRates">
                <Navbar
                    signOutUser={signOutUser}
                    openSignupForm={openSignupForm}
                    openLoginForm={openLoginForm}
                    closeAccountForm={closeAccountForm}
                />
                <main className="px-4 py-20 sm:px-8">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <HomePage
                                    openSignupForm={openSignupForm}
                                    openLoginForm={openLoginForm}
                                />
                            }
                        />
                        <Route
                            path="/user/:targetUsername?"
                            element={
                                <ProfilePage
                                    runNotification={runNotification}
                                    openLoginForm={openLoginForm}
                                />
                            }
                        />
                        <Route
                            path="/library"
                            element={
                                <LibraryPage
                                    runNotification={runNotification}
                                />
                            }
                        />
                        <Route
                            path="/game/:gameID"
                            element={
                                <GamePage
                                    openLoginForm={openLoginForm}
                                    runNotification={runNotification}
                                />
                            }
                        />
                    </Routes>
                </main>
                <Footer />
                {accountFormVisible ? (
                    <AccountForm
                        formType={currentForm}
                        closeAccountForm={closeAccountForm}
                        openSignupForm={openSignupForm}
                        openLoginForm={openLoginForm}
                        loadUserByID={loadUserByID}
                        runNotification={runNotification}
                    />
                ) : (
                    ""
                )}
                {notificationActive ? (
                    <Notification
                        text={notificationText}
                        type={notificationType}
                    />
                ) : (
                    <></>
                )}
            </Router>
        </UserContext.Provider>
    );
}

export default App;
