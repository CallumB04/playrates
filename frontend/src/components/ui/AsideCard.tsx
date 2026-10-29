import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { cardClass, CardHeader, type CardTone } from "./Card";

interface AsideCardProps {
    title: ReactNode;
    /** Beside the title: a count, a small control. */
    trailing?: ReactNode;
    /** Names the section where the title alone wouldn't. */
    label?: string;
    /** "feature" for the page's one invitation. */
    tone?: CardTone;
    className?: string;
    /** Rows that run to the card's edges set their own padding. */
    bodyClassName?: string;
    children: ReactNode;
}

/** A side-column widget: a small muted label, then compact rows. */
const AsideCard = ({
    title,
    trailing,
    label,
    tone,
    className,
    bodyClassName,
    children,
}: AsideCardProps) => (
    <section
        aria-label={label}
        className={cardClass(cn("flex flex-col pb-1.5", className), {
            padding: "none",
            tone,
        })}
    >
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1.5">
            <CardHeader>{title}</CardHeader>
            {trailing}
        </div>
        <div className={bodyClassName ?? "px-3 pb-1.5"}>{children}</div>
    </section>
);

export default AsideCard;
