import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/** The token: a gold coin struck with the mark. The P is drawn rather
 *  than typed, so it sits in the middle of the coin at any size; a letter
 *  rides on its font's baseline. */
export const TokenCoin = ({ className }: { className?: string }) => (
    <span
        aria-hidden
        className={cn(
            "metal-gold relative inline-grid size-4 shrink-0 place-items-center rounded-full",
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
        <svg viewBox="0 0 16 16" className="size-full">
            <path
                d="M6.2 11.6V4.4h2.6a2.2 2.2 0 0 1 0 4.4H6.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
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
