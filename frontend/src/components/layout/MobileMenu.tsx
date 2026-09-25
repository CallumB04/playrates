import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { LogOut, Settings, UserRound, X } from "lucide-react";
import Button from "../ui/Button";
import ProfilePicture from "../ProfilePicture";
import { GAME_STATUSES, STATUS_PRESENTATION } from "../../constants/gameStatus";
import { useOverlay } from "../../hooks/useOverlay";
import { cn } from "../../lib/cn";
import type { Profile } from "@playrates/shared";

export interface NavItem {
    to: string;
    label: string;
    active: boolean;
}

interface MobileMenuProps {
    links: NavItem[];
    user: Profile | null;
    onClose: () => void;
    onSignIn: () => void;
    onSignUp: () => void;
    onSignOut: () => void;
}

const ROW =
    "flex items-center justify-between gap-4 rounded-md px-4 py-3.5 text-body text-content-secondary transition-colors hover:bg-surface-hover hover:text-content";

/** The whole screen, not a tray under the masthead. */
const MobileMenu = ({
    links,
    user,
    onClose,
    onSignIn,
    onSignUp,
    onSignOut,
}: MobileMenuProps) => {
    useOverlay(onClose);

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex animate-settle flex-col overflow-y-auto bg-surface lg:hidden"
        >
            <div className="flex items-center justify-between px-5 pt-6 sm:px-8">
                <span className="font-display text-2xl font-bold text-content">
                    PlayRates
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close menu"
                    className="-mr-[10px] flex size-11 items-center justify-center rounded-sm text-content lift hover:text-brand"
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="flex flex-col gap-1 px-3 pt-8 sm:px-6">
                {links.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        onClick={onClose}
                        aria-current={link.active ? "page" : undefined}
                        className={cn(
                            "rounded-md px-4 py-3.5 font-display text-2xl transition-colors lift",
                            link.active
                                ? "bg-brand-subtle text-brand"
                                : "text-content hover:bg-surface-hover"
                        )}
                    >
                        {link.label}
                    </Link>
                ))}

                {user && (
                    <div className="mt-6 border-t border-subtle pt-5">
                        <p className="px-4 pb-1 text-label text-content-muted">
                            Your shelves
                        </p>
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
                                    className={cn(
                                        ROW,
                                        "justify-start gap-3 text-content"
                                    )}
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
                )}
            </nav>

            <div className="mt-auto border-t border-subtle px-3 pt-4 pb-8 sm:px-6">
                {user ? (
                    <>
                        <Link
                            to={`/user/${user.username}`}
                            onClick={onClose}
                            className={cn(ROW, "text-content")}
                        >
                            <span className="flex min-w-0 items-center gap-3">
                                <ProfilePicture
                                    variant="friendRow"
                                    file={user.avatarUrl ?? ""}
                                    accent={user.accent}
                                    username={user.username}
                                    link={false}
                                />
                                <span className="truncate">
                                    {user.username}
                                </span>
                            </span>
                            <UserRound size={17} aria-hidden />
                        </Link>
                        <Link to="/settings" onClick={onClose} className={ROW}>
                            Settings
                            <Settings size={17} aria-hidden />
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onSignOut();
                            }}
                            className={cn(
                                ROW,
                                "w-full text-left text-danger hover:bg-danger-subtle hover:text-danger"
                            )}
                        >
                            Sign out
                            <LogOut size={17} aria-hidden />
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col gap-2.5 px-1">
                        <Button
                            onClick={() => {
                                onClose();
                                onSignUp();
                            }}
                        >
                            Join PlayRates
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                onClose();
                                onSignIn();
                            }}
                        >
                            Sign in
                        </Button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MobileMenu;
