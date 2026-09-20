import { usePlatforms } from "../hooks/queries/useGames";
import { getPlatformIcon } from "../lib/icons";

/**
 * Two sizes, each a complete class string. Tailwind only emits classes it
 * finds literally in the source, so these cannot be composed at runtime.
 */
const PLATFORM_SIZE = {
    xs: { wrapper: "gap-1.5 px-1.5 h-6 text-xs", icon: 12 },
    base: { wrapper: "gap-2 px-2.5 py-0.5 text-base", icon: 16 },
} as const;

export type GamePlatformSize = keyof typeof PLATFORM_SIZE;

interface GamePlatformProps {
    platform: string;
    size: GamePlatformSize;
}

/** The platform badge. Names come from the API, icons from the icon registry. */
const GamePlatform: React.FC<GamePlatformProps> = ({ platform, size }) => {
    const { data: platforms } = usePlatforms();
    const details = (platforms ?? []).find((p) => p.slug === platform);
    const Icon = getPlatformIcon(platform);
    const { wrapper, icon } = PLATFORM_SIZE[size];

    return (
        <span
            className={`flex items-center rounded-full border-2 border-content text-content ${wrapper}`}
        >
            <p>{details?.displayName ?? platform}</p>
            <Icon size={icon} aria-hidden />
        </span>
    );
};

export default GamePlatform;
