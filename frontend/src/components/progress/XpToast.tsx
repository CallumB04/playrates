import type { XpGain } from "@playrates/shared";
import { formatCount } from "../../lib/format";
import { xpToastText } from "./rewardText";
import { TokenCoin } from "./TokenAmount";

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
