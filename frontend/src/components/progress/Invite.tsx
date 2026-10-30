import type { ReactNode } from "react";
import { Gift, Share2, UserPlus } from "lucide-react";
import { REFERRAL } from "@playrates/shared";
import AsideCard from "../ui/AsideCard";
import Button from "../ui/Button";
import { TokenCoin } from "./TokenAmount";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/cn";
import { useInviteFor } from "./useInviteFor";

const useInvite = () => useInviteFor(useAuth().user?.username);

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
                Each friend who joins with your link
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
                <Reward>+{REFERRAL.inviterXp} XP</Reward>
                <Reward>
                    +{REFERRAL.inviterTokens}
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

/** A way in where friends come up: link-styled beside other things, or a
 *  button of its own where it's the thing to do, as in an empty list. */
export const InviteButton = ({
    children = "Invite friends",
    variant = "link",
    className,
}: {
    children?: ReactNode;
    variant?: "link" | "button";
    className?: string;
}) => {
    const { ready, open, sheet } = useInvite();
    if (!ready) return null;
    return (
        <>
            {variant === "button" ? (
                <Button onClick={open} className={className}>
                    <UserPlus size={16} aria-hidden />
                    {children}
                </Button>
            ) : (
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
            )}
            {sheet}
        </>
    );
};
