import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import JoinShell from "./components/JoinShell";

/**
 * The full-screen frame /join, /join/confirmed and /login share. Held while
 * you move between them, so the art keeps its place and only the step on
 * the right changes, fading in; a step still loading leaves that side
 * empty for the moment rather than taking the whole page with it.
 */
const JoinLayout = () => {
    const { pathname } = useLocation();
    return (
        <JoinShell>
            <Suspense fallback={null}>
                <div
                    key={pathname}
                    className="flex flex-1 animate-page-in flex-col lg:justify-center"
                >
                    <Outlet />
                </div>
            </Suspense>
        </JoinShell>
    );
};

export default JoinLayout;
