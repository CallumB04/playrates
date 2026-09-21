import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Settings, UserRound } from "lucide-react";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
} from "../../constants/gameStatus";
import type { Profile } from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import { cn } from "../../lib/cn";

const ITEM =
    "flex items-center gap-2.5 px-3 py-2.5 text-body-sm text-content-secondary transition-colors hover:bg-surface-hover hover:text-content";

/**
 * The avatar, and what it opens.
 *
 * Sign out used to live only inside the mobile menu, which is hidden from
 * `lg` up — so on a desktop there was no way to sign out at all.
 */
const AccountMenu = ({
    user,
    onSignOut,
}: {
    user: Profile;
    onSignOut: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Account menu"
                className={cn(
                    "lift block rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                    open ? "ring-2 ring-brand" : "hover:ring-2 hover:ring-subtle"
                )}
            >
                <ProfilePicture
                    variant="nav"
                    file={user.avatarUrl ?? ""}
                    username={user.username}
                    link={false}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className="animate-settle absolute right-0 top-[calc(100%+0.6rem)] z-40 w-56 overflow-hidden rounded-lg border border-subtle bg-surface-raised py-1 shadow-modal"
                >
                    <p className="truncate border-b border-subtle px-3 pb-2.5 pt-1.5 text-label text-content-muted">
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
                    <div className="my-1 border-y border-subtle py-1">
                        {GAME_STATUSES.map((status) => {
                            const { label, icon: Icon, markTone } =
                                STATUS_PRESENTATION[status];
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
                        className={cn(ITEM, "w-full cursor-pointer border-t border-subtle")}
                    >
                        <LogOut size={15} aria-hidden /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccountMenu;
