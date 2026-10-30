import { useId } from "react";
import { REFERRAL } from "@playrates/shared";
import Modal from "../ui/Modal";
import { CopyLink, ShareTargets } from "../share/ShareParts";
import { TokenCoin } from "./TokenAmount";
import { cn } from "../../lib/cn";

/** The link that counts a friend as yours. */
const inviteUrl = (username: string) =>
    `${window.location.origin}/?ref=${encodeURIComponent(username)}`;

const Reward = ({
    who,
    xp,
    tokens,
    tone,
}: {
    who: string;
    xp: number;
    tokens: number;
    tone: "you" | "them";
}) => (
    <div
        className={cn(
            "flex flex-col gap-1.5 rounded-md border p-3",
            tone === "you"
                ? "border-brand/40 bg-brand-subtle"
                : "border-subtle bg-surface-sunken/60"
        )}
    >
        <p className="text-label-sm text-content-muted">{who}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-body font-bold text-content tabular-nums">
            <span>+{xp} XP</span>
            <span className="inline-flex items-center gap-1">
                +{tokens}
                <TokenCoin className="size-4" />
                <span className="sr-only">tokens</span>
            </span>
        </p>
    </div>
);

/**
 * Your invite: what it's worth to you both, and the link to send. Only the
 * link: a picture to post is the Player card's, on your profile. The
 * numbers come from the rules, so they can't drift from them.
 */
const InviteSheet = ({
    username,
    onClose,
}: {
    username: string;
    onClose: () => void;
}) => {
    const titleId = useId();
    const url = inviteUrl(username);

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-[440px]"
        >
            <h2
                id={titleId}
                className="pr-10 font-display text-section text-content"
            >
                Invite friends
            </h2>
            <p className="mt-1 text-body-sm text-content-secondary">
                Every friend who joins with your link earns you both:
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <Reward
                    who="You get"
                    tone="you"
                    xp={REFERRAL.inviterXp}
                    tokens={REFERRAL.inviterTokens}
                />
                <Reward
                    who="They get"
                    tone="them"
                    xp={REFERRAL.welcomeXp}
                    tokens={REFERRAL.welcomeTokens}
                />
            </div>
            <p className="mt-5 mb-1.5 text-label text-content-muted">
                Your link
            </p>
            <CopyLink url={url} />

            <ShareTargets
                url={url}
                text="Track your games with me on PlayRates"
                className="mt-4 border-t border-subtle pt-4 pb-3 sm:pb-0"
            />
        </Modal>
    );
};

export default InviteSheet;
