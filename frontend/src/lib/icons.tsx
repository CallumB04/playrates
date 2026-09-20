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

/**
 * Lucide throughout, except brands — Lucide has no brand set and a generic
 * controller on every console makes the platform badges unreadable, so those
 * come from simple-icons. Which icon means which platform is presentation, so
 * it lives here rather than in the database.
 */
export type IconComponent = ComponentType<
    SVGProps<SVGSVGElement> & { size?: number | string }
>;

/* Nintendo and Xbox were pulled from simple-icons over trademark complaints,
   so they fall back to a generic controller. Game Pass has no mark either. */
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

