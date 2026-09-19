import { gamePlatforms } from "../constants/gamePlatforms";

/**
 * Two sizes, each written as a complete class string. The previous version
 * interpolated its gap, padding and text-size utilities, none of which were
 * safelisted — so they were emitted only because other components happened to
 * use the same values.
 */
const PLATFORM_SIZE = {
    xs: "gap-1.5 px-1.5 h-6 text-xs",
    base: "gap-2 px-2.5 py-0.5 text-base",
} as const;

export type GamePlatformSize = keyof typeof PLATFORM_SIZE;

interface GamePlatformProps {
    platform: string;
    size: GamePlatformSize;
}

const GamePlatform: React.FC<GamePlatformProps> = ({ platform, size }) => {
    const details = gamePlatforms.find(({ name }) => name === platform);

    return (
        <span
            className={`flex items-center rounded-full border-2 border-content text-content ${PLATFORM_SIZE[size]}`}
        >
            <p>{details?.display}</p>
            <i className={details?.icon} aria-hidden="true"></i>
        </span>
    );
};

export default GamePlatform;
