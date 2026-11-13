import { cn } from "../../lib/cn";

/** What something is worth, as the rest of the site says it: in figures,
 *  in the brand's own colour, no ornament. */
const XpLabel = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => (
    <span
        className={cn(
            "font-mono text-label-sm font-medium text-brand-text tabular-nums",
            className
        )}
    >
        {children}
    </span>
);

export default XpLabel;
