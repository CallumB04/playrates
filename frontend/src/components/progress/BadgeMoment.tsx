import { useId } from "react";
import {
    METAL_TOKENS,
    METAL_XP,
    METALS,
    type BadgeDef,
    type Metal,
} from "@playrates/shared";
import Button from "../ui/Button";
import { cn } from "../../lib/cn";
import BadgeMedal from "./BadgeMedal";
import MomentStage from "./MomentStage";
import { TokenCoin } from "./TokenAmount";
import { badgeText } from "./badgeText";

const METAL_LIGHT: Record<Metal, string> = {
    1: "rgba(214,133,74,0.3)",
    2: "rgba(197,204,214,0.28)",
    3: "rgba(242,201,76,0.3)",
    4: "rgba(150,170,255,0.34)",
};

interface BadgeMomentProps {
    badge: BadgeDef;
    metal: Metal;
    /** More waiting after this one. */
    more: number;
    onNext: () => void;
    onSkipAll: () => void;
}

/** A badge earned: the medal drops in and turns to show its metal. */
const BadgeMoment = ({
    badge,
    metal,
    more,
    onNext,
    onSkipAll,
}: BadgeMomentProps) => {
    const titleId = useId();
    const metalName = METALS[metal - 1]!;
    const tokens = METAL_TOKENS[metal];
    return (
        <MomentStage
            onClose={onSkipAll}
            labelledBy={titleId}
            light={METAL_LIGHT[metal]}
        >
            <p className="animate-fade-up font-mono text-label font-bold tracking-[0.3em] text-content-on-media/70 uppercase">
                Badge earned
            </p>
            <span
                className="mt-6 block animate-medal-drop [perspective:800px]"
                style={{
                    filter: `drop-shadow(0 18px 40px ${METAL_LIGHT[metal]})`,
                }}
            >
                <BadgeMedal badge={badge} metal={metal} size="xl" />
            </span>
            <h2
                id={titleId}
                className="mt-6 animate-fade-up font-display text-section font-semibold"
                style={{ animationDelay: "350ms" }}
            >
                {badge.name}
            </h2>
            <p
                className={cn(
                    `metal-${metalName}`,
                    "pr-metal-text animate-fade-up font-mono text-label font-bold tracking-[0.2em] uppercase"
                )}
                style={{ animationDelay: "420ms" }}
            >
                {metalName}
            </p>
            <p
                className="mt-2 max-w-xs animate-fade-up text-body-sm text-content-on-media/80"
                style={{ animationDelay: "500ms" }}
            >
                {badgeText(badge, metal)}
            </p>
            <p
                className="mt-4 inline-flex animate-fade-up items-center gap-3 rounded-full bg-content-on-media/10 px-3 py-1.5 font-mono text-label font-semibold"
                style={{ animationDelay: "600ms" }}
            >
                <span>+{METAL_XP[metal]} XP</span>
                {tokens > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                        <TokenCoin />+{tokens}
                    </span>
                )}
            </p>
            <div
                className="mt-8 flex w-full animate-fade-up flex-col gap-2 sm:w-auto sm:flex-row"
                style={{ animationDelay: "700ms" }}
            >
                <Button
                    size="touch"
                    onClick={onNext}
                    className="w-full sm:w-auto"
                >
                    {more > 0 ? `Next (${more} more)` : "Nice"}
                </Button>
                {more > 0 && (
                    <Button
                        variant="secondary"
                        size="touch"
                        onClick={onSkipAll}
                        className="w-full sm:w-auto"
                    >
                        Skip all
                    </Button>
                )}
            </div>
        </MomentStage>
    );
};

export default BadgeMoment;
