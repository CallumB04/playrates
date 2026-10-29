import { useState, type ReactNode } from "react";
import { Gift, Share2, UserPlus } from "lucide-react";
import { REFERRAL } from "@playrates/shared";
import { playerCardUrl } from "../../api";
import AsideCard from "../ui/AsideCard";
import Button from "../ui/Button";
import ShareSheet from "../share/ShareSheet";
import { TokenCoin } from "./TokenAmount";
import { useAuth } from "../../contexts/AuthContext";
import { useProgress } from "../../hooks/queries/useProgress";
import { cn } from "../../lib/cn";

/** Your invite link, and the sheet that shares it with your Player card. */
const useInvite = () => {
    const { user } = useAuth();
    const { data } = useProgress();
    const [sharing, setSharing] = useState(false);
    const sheet =
        sharing && user ? (
            <ShareSheet
                title="Invite friends"
                lede={TERMS}
                url={`${window.location.origin}/?ref=${encodeURIComponent(user.username)}`}
                text="Track your games with me on PlayRates"
                imageUrl={playerCardUrl(user.username, data?.xp ?? 0)}
                fileName={`${user.username}-playrates.png`}
                onClose={() => setSharing(false)}
            />
        ) : null;
    return { ready: !!user, open: () => setSharing(true), sheet };
};

const INVITER_XP = REFERRAL.joinedXp + REFERRAL.activeXp;

// From the rules, so a change to the balance changes what this promises.
const TERMS = `${INVITER_XP} XP and ${REFERRAL.activeTokens} tokens for each friend who joins and plays ${REFERRAL.activeAfter} games. They get ${REFERRAL.welcomeXp} XP and ${REFERRAL.welcomeTokens} tokens too.`;

const Reward = ({ children }: { children: ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-raised/70 px-2.5 py-1.5 font-mono text-label font-bold text-content tabular-nums ring-1 ring-subtle">
        {children}
    </span>
);

/** The side column's invitation, on the progress page: what a friend is
 *  worth, at a glance. */
export const InviteCard = ({ className }: { className?: string }) => {
    const { ready, open, sheet } = useInvite();
    if (!ready) return null;
    return (
        <AsideCard title="Invite friends" tone="feature" className={className}>
            <p className="text-label-sm text-content-secondary">
                Each friend who joins and plays {REFERRAL.activeAfter} games
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
                <Reward>+{INVITER_XP} XP</Reward>
                <Reward>
                    +{REFERRAL.activeTokens}
                    <TokenCoin className="size-4" />
                </Reward>
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-label-sm text-content-muted">
                <Gift size={13} aria-hidden />
                They get +{REFERRAL.welcomeXp} XP and +{REFERRAL.welcomeTokens}
                <TokenCoin className="size-3.5" />
                <span className="sr-only">tokens</span> too
            </p>
            <Button size="touch" onClick={open} className="mt-3 w-full">
                <Share2 size={16} aria-hidden />
                Share your invite
            </Button>
            {sheet}
        </AsideCard>
    );
};

/** A quieter way in, where friends come up: a link-styled button. */
export const InviteButton = ({
    children = "Invite friends",
    className,
}: {
    children?: ReactNode;
    className?: string;
}) => {
    const { ready, open, sheet } = useInvite();
    if (!ready) return null;
    return (
        <>
            <button
                type="button"
                onClick={open}
                className={cn(
                    "relative inline-flex cursor-pointer items-center gap-1.5 text-label font-medium text-brand before:absolute before:-inset-2 before:content-[''] hover:underline",
                    className
                )}
            >
                <UserPlus size={14} aria-hidden />
                {children}
            </button>
            {sheet}
        </>
    );
};
