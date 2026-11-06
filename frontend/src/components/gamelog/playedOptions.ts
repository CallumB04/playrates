import { createElement, type ComponentType, type SVGProps } from "react";
import {
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    type DisplayStatus,
} from "../../constants/gameStatus";
import { cn } from "../../lib/cn";
import type { DropdownOption } from "../ui/Dropdown";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

/** The mark keeps its own hue in the menu, the way it does on a plate. Built
 *  once at module scope: a component rebuilt per render remounts the icon. */
const tonedMark = (status: DisplayStatus): ComponentType<IconProps> => {
    const { icon, markTone } = STATUS_PRESENTATION[status];
    const Mark = ({ className, ...props }: IconProps) =>
        createElement(icon, { ...props, className: cn(markTone, className) });
    Mark.displayName = `${status}Mark`;
    return Mark;
};

/** How a played game ended, as the log editor and the Steam import offer
 *  it, each with what it means. */
export const PLAYED_OPTIONS: DropdownOption[] = [
    {
        /* Empty rather than a fifth status: played_status stays null, and its
           CHECK constraint still lists only the four below. Same word as
           the plate, so choosing it is visibly choosing nothing further. */
        value: "",
        label: "Played",
        icon: tonedMark("played"),
        /* An answer in its own right, not a gap: "No further detail" read as
           something left unfinished. */
        hint: "Just played",
    },
    ...PLAYED_STATUSES.map((status) => ({
        value: status,
        label: STATUS_PRESENTATION[status].label,
        icon: tonedMark(status),
        hint: STATUS_PRESENTATION[status].hint,
    })),
];
