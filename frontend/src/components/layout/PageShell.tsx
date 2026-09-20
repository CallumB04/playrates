import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * The page column. Every mockup is a fixed-width sheet with generous outer
 * margin — the density reads as care rather than clutter because of the room
 * around it, so the padding is not decoration.
 */
const PageShell = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            "mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-5 pb-14 pt-7 sm:px-8 lg:px-12",
            className
        )}
    >
        {children}
    </div>
);

export default PageShell;
