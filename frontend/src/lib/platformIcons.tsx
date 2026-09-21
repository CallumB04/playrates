import { Gamepad2, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import { SiPlaystation, SiSteam } from "@icons-pack/react-simple-icons";
import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
export type PlatformIcon = ComponentType<IconProps> | LucideIcon;

/**
 * Xbox and Nintendo Switch.
 *
 * Simple Icons carries Steam and PlayStation but dropped these two at the
 * trademark owners' request, so the marks come from Bootstrap Icons (MIT),
 * inlined rather than pulling in the whole set for two glyphs. Used to label
 * each platform beside its own name, which is what the mark is for.
 *
 * Path data: https://github.com/twbs/icons, MIT.
 */
const XboxMark = ({ size = 16, ...props }: IconProps) => (
    <svg
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill="currentColor"
        {...props}
    >
        <path d="M7.202 15.967a8 8 0 0 1-3.552-1.26c-.898-.585-1.101-.826-1.101-1.306 0-.965 1.062-2.656 2.879-4.583C6.459 7.723 7.897 6.44 8.052 6.475c.302.068 2.718 2.423 3.622 3.531 1.43 1.753 2.088 3.189 1.754 3.829-.254.486-1.83 1.437-2.987 1.802-.954.301-2.207.429-3.239.33m-5.866-3.57C.589 11.253.212 10.127.03 8.497c-.06-.539-.038-.846.137-1.95.218-1.377 1.002-2.97 1.945-3.95.401-.417.437-.427.926-.263.595.2 1.23.638 2.213 1.528l.574.519-.313.385C4.056 6.553 2.52 9.086 1.94 10.653c-.315.852-.442 1.707-.306 2.063.091.24.007.15-.3-.319Zm13.101.195c.074-.36-.019-1.02-.238-1.687-.473-1.443-2.055-4.128-3.508-5.953l-.457-.575.494-.454c.646-.593 1.095-.948 1.58-1.25.381-.237.927-.448 1.161-.448.145 0 .654.528 1.065 1.104a8.4 8.4 0 0 1 1.343 3.102c.153.728.166 2.286.024 3.012a9.5 9.5 0 0 1-.6 1.893c-.179.393-.624 1.156-.82 1.404-.1.128-.1.127-.043-.148ZM7.335 1.952c-.67-.34-1.704-.705-2.276-.803a4 4 0 0 0-.759-.043c-.471.024-.45 0 .306-.358A7.8 7.8 0 0 1 6.47.128c.8-.169 2.306-.17 3.094-.005.85.18 1.853.552 2.418.9l.168.103-.385-.02c-.766-.038-1.88.27-3.078.853-.361.176-.676.316-.699.312a12 12 0 0 1-.654-.319Z" />
    </svg>
);

const SwitchMark = ({ size = 16, ...props }: IconProps) => (
    <svg
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill="currentColor"
        {...props}
    >
        <path d="M9.34 8.005c0-4.38.01-7.972.023-7.982C9.373.01 10.036 0 10.831 0c1.153 0 1.51.01 1.743.05 1.73.298 3.045 1.6 3.373 3.326.046.242.053.809.053 4.61 0 4.06.005 4.537-.123 4.976-.022.076-.048.15-.08.242a4.14 4.14 0 0 1-3.426 2.767c-.317.033-2.889.046-2.978.013-.05-.02-.053-.752-.053-7.979m4.675.269a1.62 1.62 0 0 0-1.113-1.034 1.61 1.61 0 0 0-1.938 1.073 1.9 1.9 0 0 0-.014.935 1.63 1.63 0 0 0 1.952 1.107c.51-.136.908-.504 1.11-1.028.11-.285.113-.742.003-1.053M3.71 3.317c-.208.04-.526.199-.695.348-.348.301-.52.729-.494 1.232.013.262.03.332.136.544.155.321.39.556.712.715.222.11.278.123.567.133.261.01.354 0 .53-.06.719-.242 1.153-.94 1.03-1.656-.142-.852-.95-1.422-1.786-1.256" />
        <path d="M3.425.053a4.14 4.14 0 0 0-3.28 3.015C0 3.628-.01 3.956.005 8.3c.01 3.99.014 4.082.08 4.39.368 1.66 1.548 2.844 3.224 3.235.22.05.497.06 2.29.07 1.856.012 2.048.009 2.097-.04.05-.05.053-.69.053-7.94 0-5.374-.01-7.906-.033-7.952-.033-.06-.09-.063-2.03-.06-1.578.004-2.052.014-2.26.05Zm3 14.665-1.35-.016c-1.242-.013-1.375-.02-1.623-.083a2.81 2.81 0 0 1-2.08-2.167c-.074-.335-.074-8.579-.004-8.907a2.85 2.85 0 0 1 1.716-2.05c.438-.176.64-.196 2.058-.2l1.282-.003v13.426Z" />
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
