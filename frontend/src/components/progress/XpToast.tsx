import type { XpGain } from "@playrates/shared";
import { formatCount } from "../../lib/format";
import { xpToastText } from "./rewardText";
import { TokenCoin } from "./TokenAmount";

/** What the gains add to a toast already saying what earned them: the
 *  sum alone, "+5 XP", since "Entry updated" has said the rest. */
export const xpJoin = (gains: XpGain[], tokens: number) => (
    <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
        +{formatCount(gains.reduce((sum, gain) => sum + gain.xp, 0))} XP
        {tokens > 0 && (
            <>
                {" · +"}
                {formatCount(tokens)}
                <TokenCoin className="ml-1 inline size-3.5 align-[-0.15em]" />
                <span className="sr-only"> tokens</span>
            </>
        )}
    </span>
);

/** The XP toast's line, with any tokens it brought shown as the coin. */
export const xpToast = (gains: XpGain[], tokens: number) =>
    tokens > 0 ? (
        <>
            {xpToastText(gains)}
            <span aria-hidden> · </span>
            <span className="inline-flex items-center gap-1 align-[-0.15em] font-mono font-semibold whitespace-nowrap tabular-nums">
                +{formatCount(tokens)}
                <TokenCoin className="size-3.5" />
                <span className="sr-only">tokens</span>
            </span>
        </>
    ) : (
        xpToastText(gains)
    );
