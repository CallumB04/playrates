import { Gamepad2, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import { SiPlaystation, SiSteam } from "@icons-pack/react-simple-icons";
import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
export type PlatformIcon = ComponentType<IconProps> | LucideIcon;

/**
 * Simple Icons dropped Xbox and Nintendo over trademark, so these two are
 * drawn here: plain geometry that reads as the platform next to its own name,
 * rather than a reproduction of either logo.
 */
const XboxMark = ({ size = 16, ...props }: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        {...props}
    >
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7.5 6.5c2 1.6 3.5 3.4 4.5 5 1-1.6 2.5-3.4 4.5-5" />
        <path d="M7.5 17.5c2-1.6 3.5-3.4 4.5-5 1 1.6 2.5 3.4 4.5 5" />
    </svg>
);

const SwitchMark = ({ size = 16, ...props }: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        {...props}
    >
        <rect x="3" y="3" width="7.5" height="18" rx="3.5" />
        <rect x="13.5" y="3" width="7.5" height="18" rx="3.5" />
        <circle cx="6.75" cy="8" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="17.25" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </svg>
);

/**
 * Keyed by the platform slugs the API actually returns. An unknown slug falls
 * back to a controller rather than rendering nothing, so a new platform never
 * leaves a hole in a row.
 */
const PLATFORM_ICONS: Record<string, PlatformIcon> = {
    steam: SiSteam,
    playstation: SiPlaystation,
    xbox: XboxMark,
    "nintendo-switch": SwitchMark,
    "pc-game-pass": Gamepad2,
    "other-pc": Monitor,
    mobile: Smartphone,
};

export const platformIcon = (slug: string): PlatformIcon =>
    PLATFORM_ICONS[slug] ?? Gamepad2;
