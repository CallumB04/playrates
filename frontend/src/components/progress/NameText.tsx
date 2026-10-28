import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface NameTextProps {
    font?: string;
    colour?: string;
    children: ReactNode;
}

/**
 * A member's name in the font and colour they set. Goes inside the element
 * that sizes and places the name: its own span carries the style, so a
 * text colour or font on the outside can't override it, and a font that
 * runs large scales against the size the outside sets.
 */
const NameText = ({
    font = "default",
    colour = "default",
    children,
}: NameTextProps) => (
    <span
        className={cn(
            font !== "default" && `name-font-${font}`,
            colour !== "default" && `name-colour-${colour}`
        )}
    >
        {children}
    </span>
);

export default NameText;
