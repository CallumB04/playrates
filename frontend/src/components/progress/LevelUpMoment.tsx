import { useId, type ReactNode } from "react";
import { Share2 } from "lucide-react";
import { levelTokens } from "@playrates/shared";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import ProfilePicture from "../ProfilePicture";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/cn";
import { formatCount } from "../../lib/format";
import AvatarFrame from "./AvatarFrame";
import NameText from "./NameText";
import { nextReward, unlocksAt, type LevelReward } from "./rewardText";
import { TokenCoin } from "./TokenAmount";

interface LevelUpMomentProps {
    level: number;
    onShare: () => void;
    onClose: () => void;
}

/** What an unlock looks like, so it reads as a thing and not a name. */
const Preview = ({ reward }: { reward: LevelReward }) => {
    const { user } = useAuth();
    switch (reward.kind) {
        case "frame":
            return (
                <AvatarFrame frame={reward.key} size="sm">
                    {user ? (
                        <ProfilePicture
                            variant="tab"
                            file={user.avatarUrl ?? ""}
                            username={user.username}
                            accent={user.accent}
                            link={false}
                        />
                    ) : (
                        <span className="block size-8 rounded-full bg-surface-raised" />
                    )}
                </AvatarFrame>
            );
        case "theme":
            return (
                <span
                    className={cn(
                        `card-theme-${reward.key}`,
                        "block size-8 rounded-sm ring-1 ring-white/10"
                    )}
                    style={{
                        background:
                            "radial-gradient(circle at 50% 35%, var(--theme-glow), transparent 70%), var(--theme-ground)",
                    }}
                />
            );
        case "font":
            return (
                <span className="text-section text-content">
                    <NameText font={reward.key}>Aa</NameText>
                </span>
            );
        case "colour":
            return (
                <span className="font-display text-section font-bold">
                    <NameText colour={reward.key}>Aa</NameText>
                </span>
            );
    }
};

const Row = ({ lead, children }: { lead: ReactNode; children: ReactNode }) => (
    <li className="flex min-h-14 items-center gap-3 px-3 py-2">
        <span className="grid w-10 shrink-0 place-items-center">{lead}</span>
        <span className="min-w-0 flex-1 text-left text-body-sm text-content">
            {children}
        </span>
    </li>
);

/**
 * A new level, the one reward worth a popup (XP and badges are toasts): the
 * number on a gold coin that lands with a glow and a single ring, then what
 * it brought, each unlock shown as itself, and what the next one is.
 */
const LevelUpMoment = ({ level, onShare, onClose }: LevelUpMomentProps) => {
    const titleId = useId();
    const unlocks = unlocksAt(level);
    const next = nextReward(level);

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-sm"
        >
            <div className="flex flex-col items-center pt-4 text-center">
                <span className="relative grid place-items-center">
                    <span
                        aria-hidden
                        className="pointer-events-none absolute size-40 animate-glow-bloom rounded-full bg-medal-gold/25 blur-2xl"
                    />
                    {/* Once, as the coin lands. Still, a ring that never
                        leaves would only be in the way. */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute size-24 animate-ring-out rounded-full border-2 border-medal-gold/70 [animation-delay:200ms] motion-reduce:hidden"
                    />
                    <span
                        aria-hidden
                        className="metal-gold relative grid size-24 animate-level-pop place-items-center rounded-full font-display text-[42px] leading-none font-extrabold"
                        style={{
                            background:
                                "radial-gradient(circle at 32% 28%, var(--metal-hi), var(--metal-mid) 55%, var(--metal-lo))",
                            boxShadow:
                                "inset 0 0 0 2px rgba(255,255,255,0.35), 0 8px 24px -8px var(--metal-glow)",
                            color: "var(--metal-ink)",
                        }}
                    >
                        {level}
                    </span>
                </span>
                <p className="mt-5 font-mono text-label-sm font-bold tracking-[0.25em] text-medal-gold uppercase">
                    Level up
                </p>
                <h2
                    id={titleId}
                    className="mt-1 font-display text-title font-semibold text-content"
                >
                    Level {level}
                </h2>
            </div>

            <ul className="mt-5 animate-fade-up divide-y divide-subtle rounded-md bg-surface-sunken/60 [animation-delay:300ms]">
                <Row lead={<TokenCoin className="size-7" />}>
                    <span className="font-mono font-semibold tabular-nums">
                        +{formatCount(levelTokens(level))}
                    </span>{" "}
                    tokens to spend in the shop
                </Row>
                {unlocks.map((u) => (
                    <Row key={u.key + u.kind} lead={<Preview reward={u} />}>
                        <span className="block font-medium">{u.label}</span>
                        <span className="block text-label-sm text-content-muted">
                            Unlocked, wear it from your profile
                        </span>
                    </Row>
                ))}
            </ul>
            {next && (
                <p className="mt-3 text-center text-label-sm text-content-muted">
                    Next: the {next.label} at level {next.level}
                </p>
            )}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Button
                    variant="secondary"
                    size="touch"
                    onClick={onShare}
                    className="w-full max-sm:order-last"
                >
                    <Share2 size={16} aria-hidden />
                    Share
                </Button>
                <Button size="touch" onClick={onClose} className="w-full">
                    Nice
                </Button>
            </div>
        </Modal>
    );
};

export default LevelUpMoment;
