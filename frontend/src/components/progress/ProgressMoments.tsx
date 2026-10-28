import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { badgeDef, levelFor } from "@playrates/shared";
import { playerCardUrl } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
    useMarkRevealed,
    useMarkSeen,
    useProgress,
} from "../../hooks/queries/useProgress";
import { profilePath } from "../../lib/profilePaths";
import ShareSheet from "../share/ShareSheet";
import { useNotify } from "../../contexts/NotificationContext";
import LaunchReveal from "./LaunchReveal";
import LevelUpMoment from "./LevelUpMoment";
import { badgeToastText } from "./rewardText";
import { xpToast } from "./XpToast";

/**
 * Watches your progress for what's new and says so: XP and badges as
 * toasts in the corner, like anything else the site tells you, and a new
 * level in a small popup of its own, the one thing worth stopping for.
 * Each is marked seen as it's shown, so a refetch never shows it twice.
 */
const ProgressMoments = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const notify = useNotify();
    const { data } = useProgress();
    const seen = useMarkSeen();
    const revealed = useMarkRevealed();
    const handled = useRef(new Set<string>());
    const [levels, setLevels] = useState<number[]>([]);
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

        // A badge's own XP is said with the badge.
        const plain = gains.filter((g) => g.source !== "badge");
        if (plain.length > 0) {
            notify(xpToast(plain, data.unseen.tokens), "success", "low");
        }
        for (const b of badges) {
            const def = badgeDef(b.badge);
            if (def) notify(badgeToastText(def, b.metal), "success");
        }
        const before = levelFor(
            data.xp - gains.reduce((n, g) => n + g.xp, 0)
        ).level;
        if (before < data.level.level) {
            setLevels((l) => [...l, data.level.level]);
        }

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

    const level = levels[0];
    const next = () => setLevels((l) => l.slice(1));

    return (
        <>
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
            {!revealing && level !== undefined && (
                <LevelUpMoment
                    level={level}
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
