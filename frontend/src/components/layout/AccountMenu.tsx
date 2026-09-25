import { useRef, useState } from "react";
import { popoverClass } from "../ui/popover";
import { Link } from "react-router-dom";
import { LogOut, Settings, UserRound } from "lucide-react";
import { GAME_STATUSES, STATUS_PRESENTATION } from "../../constants/gameStatus";
import type { Profile } from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import { cn } from "../../lib/cn";
import { useDismiss } from "../../hooks/useDismiss";

const ITEM =
    "flex min-h-11 w-full items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-left text-body-sm leading-none text-content-secondary transition-colors hover:bg-surface-hover hover:text-content sm:min-h-0";

/** The avatar, and the account menu behind it. */
const AccountMenu = ({
    user,
    onSignOut,
}: {
    user: Profile;
    onSignOut: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useDismiss([wrapRef], () => setOpen(false), {
        enabled: open,
        escape: true,
    });

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Account menu"
                className={cn(
                    "relative block rounded-full ring-offset-2 ring-offset-surface transition-shadow lift",
                    "before:absolute before:-inset-1 before:content-[''] sm:before:hidden",
                    open
                        ? "ring-2 ring-brand"
                        : "hover:ring-2 hover:ring-subtle"
                )}
            >
                <ProfilePicture
                    variant="nav"
                    file={user.avatarUrl ?? ""}
                    accent={user.accent}
                    username={user.username}
                    link={false}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className={popoverClass(
                        "absolute top-[calc(100%+0.6rem)] right-0 z-40 w-56 overflow-hidden p-1.5",
                        "menu"
                    )}
                >
                    <p className="mb-1.5 truncate border-b border-subtle px-2.5 pt-1.5 pb-2.5 text-label text-content-muted">
                        {user.username}
                    </p>
                    <Link
                        to={`/user/${user.username}`}
                        onClick={() => setOpen(false)}
                        className={ITEM}
                        role="menuitem"
                    >
                        <UserRound size={15} aria-hidden /> Your profile
                    </Link>

                    {/* The shelves. Backlog used to be a top-level nav item,
                        which gave one of the four states a promotion the
                        other three never earned. */}
                    <div className="my-1.5 border-y border-subtle py-1.5">
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
                                    onClick={() => setOpen(false)}
                                    className={ITEM}
                                    role="menuitem"
                                >
                                    <Icon
                                        size={15}
                                        aria-hidden
                                        className={cn("shrink-0", markTone)}
                                    />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>

                    <Link
                        to="/settings"
                        onClick={() => setOpen(false)}
                        className={ITEM}
                        role="menuitem"
                    >
                        <Settings size={15} aria-hidden /> Settings
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            onSignOut();
                        }}
                        className={cn(
                            ITEM,
                            "cursor-pointer text-danger hover:bg-danger-subtle hover:text-danger"
                        )}
                    >
                        <LogOut size={15} aria-hidden /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccountMenu;
