import { usePlatforms } from "../hooks/queries/useGames";
import { platformIcon } from "../lib/platformIcons";

/** Complete class strings — Tailwind only emits what it finds literally. */
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
    const Icon = platformIcon(platform);
    const { wrapper, icon } = PLATFORM_SIZE[size];

    return (
        <span
            className={`flex items-center rounded-full border border-subtle text-content ${wrapper}`}
        >
            <p>{details?.displayName ?? platform}</p>
            <Icon size={icon} aria-hidden />
        </span>
    );
};

export default GamePlatform;
