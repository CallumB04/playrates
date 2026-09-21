import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const cardClass = (className?: string) =>
    cn(
        "rounded-lg border border-subtle bg-surface-raised p-4 shadow-plate sm:p-5",
        className
    );

const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cardClass(className)} {...props} />
);

/** A card's title. Cards carry a title, and a description only when one earns its place. */
export const CardHeader = ({
    className,
    ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
    <h2
        className={cn(
            "text-label text-content-muted",
            className
        )}
        {...props}
    />
);

export default Card;
