import { lazy, Suspense, useState } from "react";
import {
    badgeDef,
    type BadgeDef,
    type Metal,
    type Progress,
} from "@playrates/shared";
import Button from "../../../../components/ui/Button";
import LaunchReveal from "../../../../components/progress/LaunchReveal";
import LevelUpMoment from "../../../../components/progress/LevelUpMoment";
import { badgeToastText } from "../../../../components/progress/rewardText";
import { xpToast } from "../../../../components/progress/XpToast";
import { useAuth } from "../../../../contexts/AuthContext";
import { useNotify } from "../../../../contexts/NotificationContext";
import {
    usePlayerBadges,
    useProgressQuery,
} from "../../../../hooks/queries/useProgress";
import Specimen from "../../components/Specimen";

// Only for whoever opens the preview.
const WelcomeFlow = lazy(
    () => import("../../../../components/onboarding/welcome/WelcomeFlow")
);

const LEVELS: { level: number; from?: number; note: string }[] = [
    { level: 2, note: "Nothing unlocked" },
    { level: 8, from: 4, note: "Four levels at once, as a badge can do" },
    { level: 15, note: "A font" },
    { level: 20, note: "A frame and a card theme" },
    { level: 50, note: "A milestone level" },
];

/**
 * The things a member sees once, or only now and then, played on demand.
 * Each runs the real component against your own account and saves nothing:
 * nothing here marks a reveal seen or a welcome done.
 */
const MomentsSection = () => {
    const { user } = useAuth();
    const notify = useNotify();
    const { data: progress } = useProgressQuery(!!user);
    const { data: badges } = usePlayerBadges(user?.username ?? "", !!user);
    const [revealing, setRevealing] = useState(false);
    const [level, setLevel] = useState<(typeof LEVELS)[number] | null>(null);
    const [welcoming, setWelcoming] = useState(false);

    /* The reveal plays what was unseen at launch. Long since seen, so it's
       given your badges back as if new, the way a member from before met
       them. */
    const asAtLaunch: Progress | null = progress
        ? {
              ...progress,
              reveal: true,
              unseen: {
                  ...progress.unseen,
                  badges: (badges?.held ?? []).map((h) => ({
                      badge: h.badge,
                      metal: h.metal,
                      unlockedAt: h.unlockedAt,
                  })),
              },
          }
        : null;

    return (
        <div className="flex flex-col gap-6">
            <p className="max-w-prose text-body-sm text-content-secondary">
                The moments a member meets once, or only now and then, to play
                on demand. Each runs the real thing against your account and
                saves nothing.
            </p>

            <Specimen
                title="Progress launch reveal"
                notes="What every member from before progress sees once, on their first visit after it ships: their history counted up, the level it comes to, their badges falling in, and the tokens they start with. New accounts never see it. Played here with your own numbers, and your badges as if just earned."
                meta="LaunchReveal progress · onShowcase · onDone · ProgressMoments plays it while progress.reveal is true, then marks it with POST /me/progress/revealed"
            >
                <Button
                    onClick={() => setRevealing(true)}
                    disabled={!asAtLaunch}
                >
                    {asAtLaunch ? "Play the reveal" : "Log in to play it"}
                </Button>
                {revealing && asAtLaunch && (
                    <LaunchReveal
                        progress={asAtLaunch}
                        onDone={() => setRevealing(false)}
                        onShowcase={() => setRevealing(false)}
                    />
                )}
            </Specimen>

            <Specimen
                title="Level up"
                notes="The one reward that’s a popup: the level on a gold coin that lands with a glow and a single ring, the tokens it brought, each unlock shown as itself, and the next one to aim for. XP and badges are toasts."
                meta="LevelUpMoment level · onShare · onClose"
            >
                {LEVELS.map((l) => (
                    <Button
                        key={l.level}
                        variant="secondary"
                        onClick={() => setLevel(l)}
                        title={l.note}
                    >
                        {l.from
                            ? `Level ${l.from} to ${l.level}`
                            : `Level ${l.level}`}
                    </Button>
                ))}
                {level !== null && (
                    <LevelUpMoment
                        level={level.level}
                        from={level.from}
                        onShare={() => setLevel(null)}
                        onClose={() => setLevel(null)}
                    />
                )}
            </Specimen>

            <Specimen
                title="Reward toasts"
                notes="XP and new badges, said in the corner like anything else the site tells you. A badge’s own XP goes with the badge rather than the XP toast."
                meta="xpToast(gains, tokens) · badgeToastText(badge, metal) · notify(text, 'success')"
            >
                <Button
                    variant="secondary"
                    onClick={() =>
                        notify(
                            xpToast(
                                [
                                    { id: 1, source: "finish", xp: 20 },
                                    { id: 2, source: "rate", xp: 5 },
                                ],
                                0
                            ),
                            "success",
                            "low"
                        )
                    }
                >
                    XP
                </Button>
                <Button
                    variant="secondary"
                    onClick={() =>
                        notify(
                            xpToast([{ id: 1, source: "quest", xp: 60 }], 2),
                            "success",
                            "low"
                        )
                    }
                >
                    XP with tokens
                </Button>
                <Button
                    variant="secondary"
                    onClick={() =>
                        notify(
                            badgeToastText(
                                badgeDef("collector") as BadgeDef,
                                2 as Metal
                            ),
                            "success"
                        )
                    }
                >
                    New badge
                </Button>
            </Specimen>

            <Specimen
                title="The welcome"
                notes="A new account’s first stop after signing up, in one popup that keeps its size from step to step: a bar that starts with signing up already filled, then You (a name and a picture), the games played (with Playing), ratings for them (passed over with nothing to rate), how PlayRates works, and You’re set, with a head start on setup to try in place. Every step can wait with Skip for now; any way out or reaching the end marks it seen, and what’s left carries on in Get started on home. The preview walks the real popup and saves nothing."
                meta="WelcomeGate opens it once, gated on owesWelcome(user, accountFormOpen) · same width as every setup sheet (ONBOARDING_POPUP)"
            >
                <Button onClick={() => setWelcoming(true)}>
                    Preview the welcome
                </Button>
                {welcoming && (
                    <Suspense fallback={null}>
                        <WelcomeFlow
                            preview
                            onClose={() => setWelcoming(false)}
                        />
                    </Suspense>
                )}
            </Specimen>
        </div>
    );
};

export default MomentsSection;
