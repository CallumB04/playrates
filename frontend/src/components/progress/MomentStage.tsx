import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "../../hooks/useOverlay";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { burst, tokenColours } from "../../lib/particles";

interface MomentStageProps {
    onClose: () => void;
    labelledBy: string;
    /** The colour of the light behind the moment, as a CSS colour. */
    light?: string;
    /** Confetti on arrival. */
    celebrate?: boolean;
    children: ReactNode;
}

/**
 * The stage for the big moments: the page dims to near black, a soft light
 * blooms behind the centre and stays still, and confetti bursts from it.
 * With reduced motion the light is simply there and nothing is thrown.
 */
const MomentStage = ({
    onClose,
    labelledBy,
    light = "var(--glow-brand)",
    celebrate = true,
    children,
}: MomentStageProps) => {
    useOverlay(onClose);
    const canvas = useRef<HTMLCanvasElement>(null);
    const still = usePrefersReducedMotion();

    useEffect(() => {
        if (!celebrate || still || !canvas.current) return;
        return burst(canvas.current, {
            colours: tokenColours([
                "--medal-gold",
                "--brand",
                "--accent",
                "--love",
                "--content",
            ]),
        });
    }, [celebrate, still]);

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="fixed inset-0 z-70 grid h-dvh animate-fade-up place-items-center overflow-hidden bg-media-scrim-strong px-4 text-content-on-media backdrop-blur-xl"
        >
            <div
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 size-[44rem] max-w-none -translate-x-1/2 -translate-y-1/2"
            >
                <div
                    className="size-full animate-glow-bloom"
                    style={{
                        background: `radial-gradient(circle, ${light} 0%, transparent 62%)`,
                    }}
                />
            </div>
            <canvas
                ref={canvas}
                aria-hidden
                className="pointer-events-none absolute inset-0 size-full"
            />
            <div className="relative flex w-full max-w-md flex-col items-center text-center">
                {children}
            </div>
        </div>,
        document.body
    );
};

export default MomentStage;
