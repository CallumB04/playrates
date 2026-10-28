import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    badgeDef,
    FRAMES,
    levelFor,
    type BadgeDef,
    type Metal,
    type XpGain,
} from "@playrates/shared";
import { playerCardUrl } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
    useMarkRevealed,
    useMarkSeen,
    useProgress,
} from "../../hooks/queries/useProgress";
import { profilePath } from "../../lib/profilePaths";
import ShareSheet from "../share/ShareSheet";
import BadgeMoment from "./BadgeMoment";
import LaunchReveal from "./LaunchReveal";
import LevelUpMoment from "./LevelUpMoment";
import RewardToast from "./RewardToast";

type Moment =
    | { kind: "badge"; badge: BadgeDef; metal: Metal }
    | { kind: "level"; level: number; frame: string | null };

/** The frame a climb from one level to another opened, if any. */
const frameOpened = (from: number, to: number): string | null => {
    let opened: string | null = null;
    for (const f of FRAMES) {
        if ("level" in f && f.level > from && f.level <= to) opened = f.key;
    }
    return opened;
};

/**
 * Watches your progress for what's new and plays it: XP as a passing
 * chip, then each badge, then a level, one at a time and in that order.
 * Each is marked seen as it's queued, so a refetch never plays it twice.
 */
const ProgressMoments = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data } = useProgress();
    const seen = useMarkSeen();
    const revealed = useMarkRevealed();
    const handled = useRef(new Set<string>());
    const [queue, setQueue] = useState<Moment[]>([]);
    const [toast, setToast] = useState<{
        gains: XpGain[];
        tokens: number;
    } | null>(null);
    const [revealing, setRevealing] = useState(false);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (!data) return;
        if (data.reveal) {
            if (!handled.current.has("reveal")) {
                handled.current.add("reveal");
                setRevealing(true);
            }
            return;
        }

        const gains = data.unseen.xp.filter(
            (g) => !handled.current.has(`xp:${g.id}`)
        );
        const badges = data.unseen.badges.filter(
            (b) => !handled.current.has(`badge:${b.badge}:${b.metal}`)
        );
        if (gains.length === 0 && badges.length === 0) return;
        gains.forEach((g) => handled.current.add(`xp:${g.id}`));
        badges.forEach((b) =>
            handled.current.add(`badge:${b.badge}:${b.metal}`)
        );

        const plain = gains.filter((g) => g.source !== "badge");
        if (plain.length > 0)
            setToast({ gains: plain, tokens: data.unseen.tokens });

        const moments: Moment[] = badges.flatMap((b) => {
            const def = badgeDef(b.badge);
            return def
                ? [{ kind: "badge" as const, badge: def, metal: b.metal }]
                : [];
        });
        const before = levelFor(
            data.xp - gains.reduce((n, g) => n + g.xp, 0)
        ).level;
        if (before < data.level.level) {
            moments.push({
                kind: "level",
                level: data.level.level,
                frame: frameOpened(before, data.level.level),
            });
        }
        if (moments.length > 0) setQueue((q) => [...q, ...moments]);

        seen.mutate({
            xpEventId: gains.at(-1)?.id,
            badges: badges.map(({ badge, metal }) => ({ badge, metal })),
        });
        // `seen` is a fresh object each render; only new data matters here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    if (!user || !data) return null;

    const finishReveal = () => {
        setRevealing(false);
        data.unseen.badges.forEach((b) =>
            handled.current.add(`badge:${b.badge}:${b.metal}`)
        );
        seen.mutate({
            badges: data.unseen.badges.map(({ badge, metal }) => ({
                badge,
                metal,
            })),
        });
        revealed.mutate();
    };

    const current = queue[0];
    const next = () => setQueue((q) => q.slice(1));

    return (
        <>
            {toast && (
                <RewardToast
                    gains={toast.gains}
                    tokens={toast.tokens}
                    onDone={() => setToast(null)}
                />
            )}
            {revealing && (
                <LaunchReveal
                    progress={data}
                    onDone={finishReveal}
                    onShowcase={() => {
                        finishReveal();
                        navigate(profilePath(user.username, "badges"));
                    }}
                />
            )}
            {!revealing && current?.kind === "badge" && (
                <BadgeMoment
                    key={`${current.badge.key}:${current.metal}`}
                    badge={current.badge}
                    metal={current.metal}
                    more={queue.filter((m) => m.kind === "badge").length - 1}
                    onNext={next}
                    onSkipAll={() =>
                        setQueue((q) => q.filter((m) => m.kind !== "badge"))
                    }
                />
            )}
            {!revealing && current?.kind === "level" && (
                <LevelUpMoment
                    level={current.level}
                    frame={current.frame}
                    onClose={next}
                    onShare={() => {
                        next();
                        setSharing(true);
                    }}
                />
            )}
            {sharing && (
                <ShareSheet
                    title={`Level ${data.level.level}`}
                    url={`${window.location.origin}${profilePath(user.username)}?ref=${encodeURIComponent(user.username)}`}
                    text={`I just reached level ${data.level.level} on PlayRates`}
                    imageUrl={playerCardUrl(user.username, data.xp)}
                    fileName={`${user.username}-playrates.png`}
                    onClose={() => setSharing(false)}
                />
            )}
        </>
    );
};

export default ProgressMoments;
