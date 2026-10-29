import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

const WIDTHS = { sm: "2px", md: "2.5px", lg: "3.5px", xl: "4.5px" } as const;

interface AvatarFrameProps {
    frame: string | null | undefined;
    size?: keyof typeof WIDTHS;
    children: ReactNode;
    className?: string;
}

/** A ring round an avatar in the frame its owner wears, if any. */
const AvatarFrame = ({
    frame,
    size = "md",
    children,
    className,
}: AvatarFrameProps) => {
    if (!frame) return <>{children}</>;
    return (
        <span
            className={cn(
                "pr-frame inline-flex shrink-0",
                `pr-frame-${frame}`,
                className
            )}
            style={{ ["--frame-width" as string]: WIDTHS[size] }}
            data-frame={frame}
        >
            {children}
        </span>
    );
};

export default AvatarFrame;
