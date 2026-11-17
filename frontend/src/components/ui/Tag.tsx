import type { ReactNode } from "react";
import { tagClass, type TagTone } from "./tagClass";

/** A label naming what something is or where it stands. Not pressable;
 *  a pill is for a toggle or a count. */
const Tag = ({
    tone = "neutral",
    className,
    children,
}: {
    tone?: TagTone;
    className?: string;
    children: ReactNode;
}) => <span className={tagClass(tone, className)}>{children}</span>;

export default Tag;
