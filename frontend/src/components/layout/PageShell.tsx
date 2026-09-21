import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** The page column: fixed max width with generous outer margin. */
const PageShell = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            "mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-5 pt-7 pb-14 sm:px-8 lg:px-12",
            className
        )}
    >
        {children}
    </div>
);

export default PageShell;
