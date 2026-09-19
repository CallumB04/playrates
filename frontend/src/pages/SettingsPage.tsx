/**
 * Placeholder. "/settings" is linked from four places in the UI — the navbar
 * account menu, the mobile menu, and the edit-profile popup — but no route
 * existed, so all four rendered a blank page.
 */
const SettingsPage = () => (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-4 text-center font-lexend">
        <h1 className="text-3xl text-content">Settings</h1>
        <p className="text-content-secondary">
            Account settings are coming in a future update.
        </p>
    </div>
);

export default SettingsPage;
