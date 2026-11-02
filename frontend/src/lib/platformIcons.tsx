import {
    Disc3,
    Gamepad,
    Gamepad2,
    Globe,
    Joystick,
    Monitor,
    MonitorPlay,
    Smartphone,
    type LucideIcon,
} from "lucide-react";
import {
    SiAndroid,
    SiApple,
    SiAtari,
    SiCommodore,
    SiIos,
    SiLinux,
    SiPlaystation,
    SiPlaystation2,
    SiPlaystation3,
    SiPlaystation4,
    SiPlaystation5,
    SiPlaystationportable,
    SiPlaystationvita,
    SiSega,
    SiSteam,
} from "@icons-pack/react-simple-icons";
import type { ComponentType, SVGProps } from "react";
import { SwitchMark, XboxMark } from "./platformMarks";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
export type PlatformIcon = ComponentType<IconProps> | LucideIcon;

/**
 * One mark per platform family, keyed by the slugs the API returns. The makers
 * with no brand mark to license take a glyph that says what kind of machine it
 * was: a d-pad for the older Nintendo consoles, an arcade stick for Neo Geo, a
 * disc for the 3DO.
 */
const PLATFORM_ICONS: Record<string, PlatformIcon> = {
    steam: SiSteam,
    "pc-game-pass": MonitorPlay,
    "other-pc": Monitor,
    playstation: SiPlaystation,
    xbox: XboxMark,
    "nintendo-switch": SwitchMark,
    nintendo: Gamepad,
    mobile: Smartphone,
    mac: SiApple,
    linux: SiLinux,
    web: Globe,
    sega: SiSega,
    atari: SiAtari,
    "commodore-amiga": SiCommodore,
    "neo-geo": Joystick,
    "3do": Disc3,
    "other-console": Gamepad2,
};

/** An unknown family falls back to a controller rather than leaving a hole in
 *  a row. */
export const platformIcon = (slug: string): PlatformIcon =>
    PLATFORM_ICONS[slug] ?? Gamepad2;

/** The handful of machines with a mark of their own. Everything else wears its
 *  family's — a Mega Drive is recognisable as a SEGA. */
const SYSTEM_ICONS: Record<string, PlatformIcon> = {
    playstation5: SiPlaystation5,
    playstation4: SiPlaystation4,
    playstation3: SiPlaystation3,
    playstation2: SiPlaystation2,
    psp: SiPlaystationportable,
    "ps-vita": SiPlaystationvita,
    ios: SiIos,
    android: SiAndroid,
    macos: SiApple,
};

export const systemIcon = (slug: string, platformSlug: string): PlatformIcon =>
    SYSTEM_ICONS[slug] ?? platformIcon(platformSlug);

/** Platform options for a Dropdown, with the brand mark on each. */
export const platformOptions = (
    platforms: { slug: string; displayName: string }[],
    emptyLabel?: string
) => [
    ...(emptyLabel ? [{ value: "", label: emptyLabel }] : []),
    ...platforms.map((platform) => ({
        value: platform.slug,
        label: platform.displayName,
        icon: platformIcon(platform.slug),
    })),
];

/** The same, one level down. Order is the API's: family, then machine. */
export const systemOptions = (
    systems: { slug: string; displayName: string; platformSlug: string }[],
    emptyLabel?: string
) => [
    ...(emptyLabel ? [{ value: "", label: emptyLabel }] : []),
    ...systems.map((system) => ({
        value: system.slug,
        label: system.displayName,
        icon: systemIcon(system.slug, system.platformSlug),
    })),
];
