import { useId, useState } from "react";
import { Link } from "react-router-dom";
import {
    ChevronDown,
    ListChecks,
    LogOut,
    Moon,
    Settings,
    Shield,
    Sun,
} from "lucide-react";
import type { MyProfile } from "@playrates/shared";
import { useTheme } from "../../contexts/ThemeContext";
import { GAME_STATUSES, STATUS_PRESENTATION } from "../../constants/gameStatus";
import type { SetupStep } from "../../lib/setupChecklist";
import { cn } from "../../lib/cn";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { ProgressRing, SetupSteps } from "./SetupSteps";

interface MoreSheetProps {
    user: MyProfile | null;
    /** Steps left in setting up the profile; null once there are none. */
    setup: SetupStep[] | null;
    onClose: () => void;
    onSignIn: () => void;
    onSignUp: () => void;
    onSignOut: () => void;
}

const ROW =
    "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-body text-content-secondary transition-colors hover:bg-surface-hover hover:text-content";

/** Everything the bar has no tab for: what the menu and the account menu
 *  held, less the destinations the bar now carries. */
const MoreSheet = ({
    user,
    setup,
    onClose,
    onSignIn,
    onSignUp,
    onSignOut,
}: MoreSheetProps) => {
    const { theme, toggleTheme } = useTheme();
    const titleId = useId();
    const done = setup?.filter((step) => step.done).length ?? 0;
    const [stepsOpen, setStepsOpen] = useState(false);

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-md"
        >
            <h2
                id={titleId}
                className="pr-10 font-display text-section text-content"
            >
                {user ? user.username : "PlayRates"}
            </h2>

            {setup && (
                <section className="mt-4 rounded-md border border-subtle bg-surface-sunken/50 p-1">
                    {/* One row until asked: the steps opened by default
                        pushed Sign out below the sheet's fold. */}
                    <button
                        type="button"
                        aria-expanded={stepsOpen}
                        onClick={() => setStepsOpen((open) => !open)}
                        className={cn(ROW, "text-content")}
                    >
                        <ListChecks
                            size={18}
                            aria-hidden
                            className="shrink-0 text-brand"
                        />
                        <span className="min-w-0 flex-1">Get started</span>
                        <span className="font-mono text-label text-content-muted">
                            {done}/{setup.length}
                        </span>
                        <ProgressRing share={done / setup.length} />
                        <ChevronDown
                            size={16}
                            aria-hidden
                            className={cn(
                                "shrink-0 text-content-muted transition-transform",
                                stepsOpen && "rotate-180"
                            )}
                        />
                    </button>
                    {stepsOpen && (
                        <div className="px-1 pb-1">
                            <SetupSteps
                                steps={setup}
                                done={done}
                                onNavigate={onClose}
                            />
                        </div>
                    )}
                </section>
            )}

            {user && (
                <section className="mt-4">
                    <p className="px-3 pb-1 text-label text-content-muted">
                        Your shelves
                    </p>
                    {/* Two by two: four rows of their own pushed the account
                        rows down past a small phone's sheet. */}
                    <div className="grid grid-cols-2 gap-1">
                        {GAME_STATUSES.map((status) => {
                            const {
                                label,
                                icon: Icon,
                                markTone,
                            } = STATUS_PRESENTATION[status];
                            return (
                                <Link
                                    key={status}
                                    to={`/user/${user.username}?type=${status}`}
                                    onClick={onClose}
                                    className={cn(ROW, "text-content")}
                                >
                                    <Icon
                                        size={18}
                                        aria-hidden
                                        className={cn("shrink-0", markTone)}
                                    />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            <div className="mt-3 border-t border-subtle pt-3">
                {user && (
                    <Link to="/settings" onClick={onClose} className={ROW}>
                        <Settings size={18} aria-hidden />
                        Settings
                    </Link>
                )}
                {/* Stays open, so the change is seen to have taken. */}
                <button type="button" onClick={toggleTheme} className={ROW}>
                    {theme === "dark" ? (
                        <Sun size={18} aria-hidden />
                    ) : (
                        <Moon size={18} aria-hidden />
                    )}
                    {theme === "dark" ? "Day mode" : "Night mode"}
                </button>
                {user?.isAdmin && (
                    <Link to="/admin" onClick={onClose} className={ROW}>
                        <Shield size={18} aria-hidden />
                        Admin
                    </Link>
                )}
                {user && (
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onSignOut();
                        }}
                        className={cn(
                            ROW,
                            "text-danger hover:bg-danger-subtle hover:text-danger"
                        )}
                    >
                        <LogOut size={18} aria-hidden />
                        Sign out
                    </button>
                )}
            </div>

            {!user && (
                <div className="mt-4 flex flex-col gap-2.5">
                    <Button
                        size="touch"
                        onClick={() => {
                            onClose();
                            onSignUp();
                        }}
                    >
                        Join PlayRates
                    </Button>
                    <Button
                        variant="secondary"
                        size="touch"
                        onClick={() => {
                            onClose();
                            onSignIn();
                        }}
                    >
                        Sign in
                    </Button>
                </div>
            )}
        </Modal>
    );
};

export default MoreSheet;
