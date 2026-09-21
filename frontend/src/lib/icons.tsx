import type { ComponentType, SVGProps } from "react";
import {
    CalendarPlus,
    CheckCircle2,
    Gamepad2,
    Heart,
    Monitor,
    PlayCircle,
    Smartphone,
} from "lucide-react";
import { SiPlaystation, SiSteam } from "@icons-pack/react-simple-icons";

/** Lucide throughout, except brand marks, which come from simple-icons. */
export type IconComponent = ComponentType<
    SVGProps<SVGSVGElement> & { size?: number | string }
>;

// Simple Icons dropped Nintendo and Xbox over trademark, so these fall back.
const PLATFORM_ICONS: Record<string, IconComponent> = {
    steam: SiSteam,
    playstation: SiPlaystation,
    xbox: Gamepad2,
    "nintendo-switch": Gamepad2,
    "pc-game-pass": Monitor,
    "other-pc": Monitor,
    mobile: Smartphone,
};

/** Falls back to a controller so an unknown platform still renders. */
export const getPlatformIcon = (slug: string): IconComponent =>
    PLATFORM_ICONS[slug] ?? Gamepad2;

/** Game log statuses — UI concepts, so Lucide rather than brands. */
const STATUS_ICONS: Record<string, IconComponent> = {
    played: CheckCircle2,
    playing: PlayCircle,
    backlog: CalendarPlus,
    wishlist: Heart,
};

export const getStatusIcon = (status: string): IconComponent | undefined =>
    STATUS_ICONS[status];
