import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { ProfileAccent } from "@playrates/shared";
import { fetchReferralInvite } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { pendingReferral } from "../../lib/referral";
import { formatCount } from "../../lib/format";
import { cardClass } from "../ui/Card";
import Button from "../ui/Button";
import ProfilePicture from "../ProfilePicture";
import AvatarFrame from "./AvatarFrame";
import { TokenCoin } from "./TokenAmount";

const DISMISSED = "pr_invite_banner_closed";

/**
 * For someone who arrived on a friend's invite and has no account yet: who
 * asked them, and what joining is worth to both. Read from the address
 * as well as storage, since the invite is only stored once the page has
 * drawn.
 */
const InviteBanner = () => {
    const { user, isLoading } = useAuth();
    const { openSignup } = useAccountForm();
    const { search } = useLocation();
    const [closed, setClosed] = useState(() => {
        try {
            return sessionStorage.getItem(DISMISSED) === "1";
        } catch {
            return false;
        }
    });
    const ref = new URLSearchParams(search).get("ref") ?? pendingReferral();
    const show = !user && !isLoading && !closed && !!ref;
    const { data: invite } = useQuery({
        queryKey: ["referrals", ref],
        queryFn: () => fetchReferralInvite(ref!),
        enabled: show,
        staleTime: Infinity,
        retry: false,
    });

    if (!show || !invite) return null;

    const close = () => {
        setClosed(true);
        try {
            sessionStorage.setItem(DISMISSED, "1");
        } catch {
            // Closed for this page view only, then.
        }
    };

    return (
        <aside
            aria-label="Your invite"
            className={cardClass(
                "relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center"
            )}
        >
            <div className="flex min-w-0 flex-1 items-center gap-3 pr-10 sm:pr-0">
                <AvatarFrame
                    frame={invite.frame}
                    size="sm"
                    className="shrink-0"
                >
                    <ProfilePicture
                        variant="nav"
                        file={invite.avatarUrl ?? ""}
                        username={invite.username}
                        accent={invite.accent as ProfileAccent}
                        link={false}
                    />
                </AvatarFrame>
                <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-content">
                        {invite.username} invited you to PlayRates
                    </p>
                    <p className="mt-0.5 text-label text-content-secondary">
                        Join and play {formatCount(invite.reward.afterGames)}{" "}
                        games for +{formatCount(invite.reward.xp)} XP and{" "}
                        <span className="inline-flex items-center gap-1 align-[-0.15em] whitespace-nowrap">
                            +{formatCount(invite.reward.tokens)}
                            <TokenCoin className="size-3.5" />
                            <span className="sr-only">tokens</span>
                        </span>
                    </p>
                </div>
            </div>
            <Button onClick={openSignup} className="w-full sm:w-auto">
                Join PlayRates
            </Button>
            <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute top-2 right-2 grid size-11 cursor-pointer place-items-center rounded-sm text-content-muted hover:bg-surface-hover hover:text-content sm:static sm:size-9"
            >
                <X size={16} aria-hidden />
            </button>
        </aside>
    );
};

export default InviteBanner;
