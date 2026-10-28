import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/** The token: a gold coin struck with the mark. */
export const TokenCoin = ({ className }: { className?: string }) => (
    <span
        aria-hidden
        className={cn(
            "metal-gold relative inline-grid size-4 shrink-0 place-items-center rounded-full font-display text-[8px] font-extrabold",
            className
        )}
        style={{
            background:
                "radial-gradient(circle at 32% 28%, var(--metal-hi), var(--metal-mid) 55%, var(--metal-lo))",
            boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.35), 0 2px 6px -2px var(--metal-glow)",
            color: "var(--metal-ink)",
        }}
    >
        P
    </span>
);

interface TokenAmountProps {
    amount: number;
    className?: string;
}

/** A sum of tokens, coin first. */
const TokenAmount = ({ amount, className }: TokenAmountProps) => (
    <span
        className={cn(
            "inline-flex items-center gap-1.5 font-mono font-semibold text-content tabular-nums",
            className
        )}
        aria-label={`${formatCount(amount)} tokens`}
    >
        <TokenCoin />
        <span aria-hidden>{formatCount(amount)}</span>
    </span>
);

export default TokenAmount;
