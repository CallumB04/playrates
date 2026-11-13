import { useId } from "react";
import { REFERRAL } from "@playrates/shared";
import Popup from "../ui/Popup";
import { CopyLink, ShareTargets } from "../share/ShareParts";
import { TokenCoin } from "./TokenAmount";
import { cn } from "../../lib/cn";
import { inviteUrl } from "./inviteUrl";

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
    publicProfile = false,
    onClose,
}: {
    username: string;
    publicProfile?: boolean;
    onClose: () => void;
}) => {
    const titleId = useId();
    const url = inviteUrl(username, publicProfile);

    return (
        <Popup
            onClose={onClose}
            titleId={titleId}
            width="w-full sm:max-w-[440px]"
            title="Invite friends"
            blurb="Every friend who joins with your link earns you both:"
        >
            <div className="grid grid-cols-2 gap-2">
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
                className="mt-4 border-t border-subtle pt-4"
            />
        </Popup>
    );
};

export default InviteSheet;
