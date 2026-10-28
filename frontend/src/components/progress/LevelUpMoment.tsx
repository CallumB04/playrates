import { useId } from "react";
import { Share2 } from "lucide-react";
import { FRAMES, levelTokens } from "@playrates/shared";
import Button from "../ui/Button";
import ProfilePicture from "../ProfilePicture";
import { useAuth } from "../../contexts/AuthContext";
import AvatarFrame from "./AvatarFrame";
import MomentStage from "./MomentStage";
import { TokenCoin } from "./TokenAmount";

interface LevelUpMomentProps {
    level: number;
    /** A frame this level opens, if it opens one. */
    frame: string | null;
    onShare: () => void;
    onClose: () => void;
}

/** A new level: the number struck in gold, with what it brought. */
const LevelUpMoment = ({
    level,
    frame,
    onShare,
    onClose,
}: LevelUpMomentProps) => {
    const titleId = useId();
    const { user } = useAuth();
    const frameName = FRAMES.find((f) => f.key === frame)?.label;

    return (
        <MomentStage
            onClose={onClose}
            labelledBy={titleId}
            light="rgba(242,201,76,0.28)"
        >
            <p className="animate-fade-up font-mono text-label font-bold tracking-[0.3em] text-medal-gold uppercase">
                Level up
            </p>
            <h2 id={titleId} className="sr-only">
                Level {level}
            </h2>
            <span
                aria-hidden
                className="metal-gold pr-metal-text animate-level-pop font-display text-[7.5rem] leading-none font-extrabold tracking-tight sm:text-[10rem]"
                style={{
                    filter: "drop-shadow(0 8px 30px rgba(242,201,76,0.45))",
                }}
            >
                {level}
            </span>
            <p
                className="mt-2 animate-fade-up text-body text-content-on-media/80"
                style={{ animationDelay: "300ms" }}
            >
                You reached level {level}.
            </p>
            <p
                className="mt-3 inline-flex animate-fade-up items-center gap-2 rounded-full bg-content-on-media/10 px-3 py-1.5 font-mono text-label font-semibold"
                style={{ animationDelay: "450ms" }}
            >
                <TokenCoin />+{levelTokens(level)} tokens
            </p>

            {frame && user && (
                <div
                    className="mt-6 flex animate-fade-up items-center gap-3 rounded-lg bg-content-on-media/10 p-3 pr-5 text-left"
                    style={{ animationDelay: "600ms" }}
                >
                    <AvatarFrame frame={frame} size="md">
                        <ProfilePicture
                            variant="friendRowLarge"
                            file={user.avatarUrl ?? ""}
                            username={user.username}
                            accent={user.accent}
                            link={false}
                        />
                    </AvatarFrame>
                    <span>
                        <span className="block text-label-sm text-content-on-media/70">
                            New frame
                        </span>
                        <span className="block font-semibold">{frameName}</span>
                    </span>
                </div>
            )}

            <div
                className="mt-8 flex w-full animate-fade-up flex-col gap-2 sm:w-auto sm:flex-row"
                style={{ animationDelay: "700ms" }}
            >
                <Button
                    size="touch"
                    onClick={onShare}
                    className="w-full sm:w-auto"
                >
                    <Share2 size={16} aria-hidden />
                    Share
                </Button>
                <Button
                    variant="secondary"
                    size="touch"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Nice
                </Button>
            </div>
        </MomentStage>
    );
};

export default LevelUpMoment;
