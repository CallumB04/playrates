import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { XpGain } from "@playrates/shared";
import { formatCount } from "../../lib/format";
import { TokenCoin } from "./TokenAmount";
import { SOURCE_LABELS } from "./sources";

interface RewardToastProps {
    gains: XpGain[];
    tokens: number;
    onDone: () => void;
}

const SHOWN_MS = 3800;

/** XP just earned: a chip that rises in under the header, says what for,
 *  and goes. Not a toast in the stack: it isn't something to act on. */
const RewardToast = ({ gains, tokens, onDone }: RewardToastProps) => {
    useEffect(() => {
        const t = setTimeout(onDone, SHOWN_MS);
        return () => clearTimeout(t);
    }, [onDone]);

    const total = gains.reduce((n, g) => n + g.xp, 0);
    const reasons = [
        ...new Set(gains.map((g) => SOURCE_LABELS[g.source] ?? "")),
    ]
        .filter(Boolean)
        .slice(0, 3);

    return createPortal(
        <div
            role="status"
            className="pointer-events-none fixed inset-x-0 top-[calc(var(--spacing-navbar)+0.75rem)] z-80 flex justify-center px-4"
        >
            <div className="pointer-events-auto flex animate-xp-rise items-center gap-3 rounded-full border border-brand/40 bg-surface-overlay py-2 pr-4 pl-2 shadow-lifted">
                <span className="grid h-9 min-w-9 place-items-center rounded-full bg-action px-2.5 font-mono text-label font-bold text-action-ink shadow-glow">
                    +{formatCount(total)}
                </span>
                <span className="min-w-0">
                    <span className="block font-mono text-label-sm font-bold tracking-wider text-brand uppercase">
                        XP
                    </span>
                    <span className="block truncate text-label text-content">
                        {reasons.join(" · ")}
                    </span>
                </span>
                {tokens > 0 && (
                    <span className="ml-1 inline-flex items-center gap-1.5 font-mono text-label font-semibold text-content">
                        <TokenCoin />+{tokens}
                    </span>
                )}
            </div>
        </div>,
        document.body
    );
};

export default RewardToast;
