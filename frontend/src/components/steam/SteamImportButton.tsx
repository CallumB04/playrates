import { lazy, Suspense, useState, type ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSteamAvailable } from "./useSteamAvailable";

const SteamImportModal = lazy(() => import("./SteamImportModal"));

/** The dialog, with the Steam link from the member's profile filled in. */
const Opened = ({ onClose }: { onClose: () => void }) => {
    const { user } = useAuth();
    return (
        <Suspense fallback={null}>
            <SteamImportModal
                initialProfile={user?.about.steam ?? ""}
                onClose={onClose}
            />
        </Suspense>
    );
};

/**
 * Opens the Steam import where you are, from whatever control is passed
 * in. Nothing at all where the import isn't switched on.
 */
const SteamImportButton = ({
    children,
}: {
    children: (open: () => void) => ReactNode;
}) => {
    const available = useSteamAvailable();
    const [open, setOpen] = useState(false);
    if (!available) return null;

    return (
        <>
            {children(() => setOpen(true))}
            {open && <Opened onClose={() => setOpen(false)} />}
        </>
    );
};

export default SteamImportButton;
