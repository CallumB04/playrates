import { useId, useState } from "react";
import { Info } from "lucide-react";
import {
    METAL_TOKENS,
    METAL_XP,
    QUESTS,
    REFERRAL,
    STREAK_XP,
    levelTokens,
    streakXp,
    SETUP_REWARD,
    TASK_TOKENS,
    type QuestDef,
} from "@playrates/shared";
import Modal from "../ui/Modal";
import { TokenCoin } from "./TokenAmount";
import { useXpRules } from "../../hooks/queries/useProgress";
import { formatCount } from "../../lib/format";

const GROUPS: { title: string; rows: [source: string, label: string][] }[] = [
    {
        title: "Your games",
        rows: [
            ["shelve", "Add to your backlog or wishlist"],
            ["play", "Log a game you’ve played"],
            ["finish", "Finish a game"],
            ["master", "Master a game"],
            ["rate", "Rate a game"],
            ["review_short", "Write a review"],
            ["review_long", "Write 200 characters or more"],
        ],
    },
    {
        title: "Community",
        rows: [
            ["thread", "Start a thread"],
            ["reply", "Reply to one"],
            ["friend", "Make a friend"],
            ["list", "Make a list of 5 games"],
            ["g25_complete", "Finish your Gaming 25"],
        ],
    },
    {
        title: "When people like your stuff",
        rows: [
            ["review_upvote", "A reaction on your review"],
            ["post_upvote", "A reaction in the community"],
            ["list_upvote", "A love on your list"],
            ["g25_love", "A love on your Gaming 25"],
        ],
    },
    {
        title: "Your profile, once each",
        rows: [
            ["avatar", "Add a picture"],
            ["bio", "Write a bio"],
            ["background", "Pick a background"],
            ["favourites", "Pick six favourites"],
        ],
    },
];

const range = (values: number[]) => {
    const low = Math.min(...values);
    const high = Math.max(...values);
    return low === high ? formatCount(low) : `${low} to ${high}`;
};
const questXp = (period: "week" | "month") =>
    range(
        (QUESTS as readonly QuestDef[])
            .filter((q) => q.period === period)
            .map((q) => q.xp)
    );

/* Read from the rules themselves, so a change to the balance can't leave
   this saying the old numbers. */
const BIG: [label: string, xp: string][] = [
    ["A week in your streak", `${streakXp(1)} to ${STREAK_XP.max}`],
    ["A weekly task", questXp("week")],
    ["A monthly task", questXp("month")],
    ["A badge, by metal", Object.values(METAL_XP).map(formatCount).join(" / ")],
    [
        "A friend joins from your invite",
        `${REFERRAL.joinedXp}, then ${REFERRAL.activeXp}`,
    ],
    ["Getting started, all of it", String(SETUP_REWARD.xp)],
];

const TOKENS: [label: string, tokens: string][] = [
    ["Each level", String(levelTokens(1))],
    ["Every 5th level / every 10th", `${levelTokens(5)} / ${levelTokens(10)}`],
    [
        "A silver badge / gold / platinum",
        `${METAL_TOKENS[2]} / ${METAL_TOKENS[3]} / ${METAL_TOKENS[4]}`,
    ],
    [
        "A weekly task / a monthly one",
        `${TASK_TOKENS.week} / ${TASK_TOKENS.month}`,
    ],
    ["Getting started, all of it", String(SETUP_REWARD.tokens)],
    ["A friend gets going", String(REFERRAL.activeTokens)],
];

/** A small "i" that opens how XP and tokens are earned. */
const XpInfo = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="How XP works"
                className="relative grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm text-content-muted before:absolute before:-inset-2.5 before:content-[''] hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-brand"
            >
                <Info size={16} aria-hidden />
            </button>
            {open && <XpInfoSheet onClose={() => setOpen(false)} />}
        </>
    );
};

const Row = ({
    label,
    value,
    cap,
}: {
    label: string;
    value: string;
    cap?: number | null;
}) => (
    <li className="flex items-baseline gap-3 py-1.5 text-body-sm">
        <span className="min-w-0 flex-1 text-content-secondary">{label}</span>
        {cap != null && (
            <span className="shrink-0 font-mono text-label-sm text-content-muted">
                up to {formatCount(cap)} XP a day
            </span>
        )}
        <span className="min-w-10 shrink-0 text-right font-mono font-semibold text-content tabular-nums">
            {value}
        </span>
    </li>
);

const Group = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <section>
        <h3 className="text-label text-content-muted">{title}</h3>
        <ul className="mt-1 divide-y divide-subtle">{children}</ul>
    </section>
);

const XpInfoSheet = ({ onClose }: { onClose: () => void }) => {
    const titleId = useId();
    const { data: rules } = useXpRules();
    const rule = new Map(rules?.map((r) => [r.source, r]));
    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-3xl"
        >
            <h2
                id={titleId}
                className="font-display text-section font-semibold text-content"
            >
                How XP works
            </h2>
            <p className="mt-1 max-w-prose text-body-sm text-content-secondary">
                Each thing pays once: delete it and its XP goes with it. Daily
                limits keep a bulk import from counting as a week of play.
            </p>
            <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {GROUPS.map((g) => (
                    <Group key={g.title} title={g.title}>
                        {g.rows.map(([source, label]) => {
                            const r = rule.get(source);
                            return (
                                <Row
                                    key={source}
                                    label={label}
                                    value={r ? `+${r.xp}` : "…"}
                                    cap={r?.dailyCap}
                                />
                            );
                        })}
                    </Group>
                ))}
                <Group title="Bigger rewards">
                    {BIG.map(([label, xp]) => (
                        <Row key={label} label={label} value={xp} />
                    ))}
                </Group>
                <section>
                    <h3 className="inline-flex items-center gap-1.5 text-label text-content-muted">
                        <TokenCoin className="size-3.5" />
                        Tokens, to spend in the shop
                    </h3>
                    <ul className="mt-1 divide-y divide-subtle">
                        {TOKENS.map(([label, n]) => (
                            <Row key={label} label={label} value={n} />
                        ))}
                    </ul>
                </section>
            </div>
        </Modal>
    );
};

export default XpInfo;
