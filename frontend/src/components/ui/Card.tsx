import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const cardClass = (className?: string) =>
    cn("border border-strong bg-surface-raised p-4 shadow-lip sm:p-5", className);

const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cardClass(className)} {...props} />
);

/** The small mono eyebrow at the top of a card. */
export const CardHeader = ({
    className,
    ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
    <h2
        className={cn(
            "font-mono text-label uppercase text-content-muted",
            className
        )}
        {...props}
    />
);

export default Card;
