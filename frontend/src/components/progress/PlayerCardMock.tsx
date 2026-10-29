import type { CardThemeKey } from "@playrates/shared";
import { cn } from "../../lib/cn";

interface PlayerCardMockProps {
    theme: CardThemeKey;
    username: string;
    avatarUrl: string | null;
    level: number;
    /** A thumbnail drops the words the picture is too small to read. The
     *  width comes from the caller. */
    size?: "thumb" | "full";
    className?: string;
}

/**
 * The shared Player card drawn in the page, so a theme can be seen before
 * it's owned: the server only renders the themes you have.
 */
const PlayerCardMock = ({
    theme,
    username,
    avatarUrl,
    level,
    size = "full",
    className,
}: PlayerCardMockProps) => {
    const thumb = size === "thumb";
    return (
        <span
            aria-hidden
            className={cn(
                `card-theme-${theme}`,
                "relative flex aspect-[4/5] flex-col items-center overflow-hidden rounded-md text-[#f4f2f8] ring-1 ring-white/10",
                thumb ? "pt-[18%]" : "pt-[16%]",
                className
            )}
            style={{
                background:
                    "radial-gradient(ellipse at 50% 30%, var(--theme-glow), transparent 62%), var(--theme-ground)",
            }}
        >
            {!thumb && (
                <span className="absolute top-[4%] left-[6%] font-mono text-[8px] font-bold tracking-[0.25em] text-[#b9b3c7]">
                    PLAYER CARD
                </span>
            )}
            <span
                className="relative grid aspect-square w-[42%] place-items-center rounded-full p-[5%]"
                style={{ boxShadow: "inset 0 0 0 2px var(--theme-accent)" }}
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt=""
                        className="size-full rounded-full object-cover"
                    />
                ) : (
                    <span
                        className={cn(
                            "grid size-full place-items-center rounded-full font-display font-extrabold",
                            thumb ? "text-[11px]" : "text-[40px]"
                        )}
                        style={{ background: "var(--theme-glow)" }}
                    >
                        {username.slice(0, 1).toUpperCase()}
                    </span>
                )}
                <span
                    className={cn(
                        "absolute -bottom-[8%] rounded-full font-mono font-extrabold whitespace-nowrap",
                        thumb ? "px-1 text-[7px]" : "px-2 py-0.5 text-[10px]"
                    )}
                    style={{
                        background: "var(--theme-ground)",
                        boxShadow: "inset 0 0 0 1.5px var(--theme-accent)",
                    }}
                >
                    {thumb ? level : `LEVEL ${level}`}
                </span>
            </span>
            {thumb ? (
                <span className="mt-[16%] h-1 w-1/2 rounded-full bg-white/70" />
            ) : (
                <>
                    <span className="mt-[9%] max-w-[90%] truncate font-display text-[17px] font-extrabold tracking-tight">
                        {username}
                    </span>
                    <span className="mt-[8%] grid w-[84%] grid-cols-4 gap-1 rounded-sm bg-white/5 p-1.5 ring-1 ring-white/10">
                        {[0, 1, 2, 3].map((i) => (
                            <span
                                key={i}
                                className="flex flex-col items-center gap-1"
                            >
                                <span className="h-1.5 w-3/5 rounded-full bg-white/70" />
                                <span className="h-1 w-4/5 rounded-full bg-white/25" />
                            </span>
                        ))}
                    </span>
                </>
            )}
            <span
                className={cn(
                    "mt-auto mb-[6%] h-[3px] rounded-full",
                    thumb ? "w-1/4" : "w-1/3"
                )}
                style={{ background: "var(--theme-accent)" }}
            />
        </span>
    );
};

export default PlayerCardMock;
