import type { ComponentType, SVGProps } from "react";
import { CalendarPlus, CheckCircle2, Heart, PlayCircle } from "lucide-react";

export type IconComponent = ComponentType<
    SVGProps<SVGSVGElement> & { size?: number | string }
>;

// Platform and system marks live in platformIcons.tsx, alongside the brand
// marks that have to be inlined.

/** Game log statuses — UI concepts, so Lucide rather than brands. */
const STATUS_ICONS: Record<string, IconComponent> = {
    played: CheckCircle2,
    playing: PlayCircle,
    backlog: CalendarPlus,
    wishlist: Heart,
};

export const getStatusIcon = (status: string): IconComponent | undefined =>
    STATUS_ICONS[status];
