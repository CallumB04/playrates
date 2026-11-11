import { lazy, Suspense, useEffect } from "react";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useAuth } from "../../contexts/AuthContext";
import { whenIdle } from "../../lib/whenIdle";

/* The log-in popup, its art and its forms are only wanted once Sign in is
   pressed, so they stay out of the first load; fetched when the page is
   idle for anyone signed out, so it still opens straight away. */
const loadModal = () => import("./AccountFormModal");
const AccountFormModal = lazy(loadModal);

const AccountFormHost = () => {
    const { mode } = useAccountForm();
    const { user, isLoading } = useAuth();
    const signedOut = !isLoading && !user;

    useEffect(() => {
        if (signedOut) return whenIdle(() => void loadModal());
    }, [signedOut]);

    if (!mode) return null;
    return (
        <Suspense fallback={null}>
            <AccountFormModal />
        </Suspense>
    );
};

export default AccountFormHost;
