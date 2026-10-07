import type { GameLog } from "@playrates/shared";
import { usePlatforms, usePlatformSystems } from "../../hooks/queries/useGames";
import {
    platformIcon,
    systemIcon,
    type PlatformIcon,
} from "../../lib/platformIcons";
import { playedOnName } from "../../lib/gameSystems";

export interface PlayedOn {
    /** Null where the log names no console. */
    name: string | null;
    Icon: PlatformIcon;
}

/** Names a log by the console it was played on, which is what tells one of
 *  a game's logs from another. */
export const usePlayedOn = () => {
    const { data: systems } = usePlatformSystems();
    const { data: platforms } = usePlatforms();

    return (log: Pick<GameLog, "system" | "platform">): PlayedOn => {
        const system = (systems ?? []).find((s) => s.slug === log.system);
        return {
            name: playedOnName(log, systems ?? [], platforms ?? []),
            Icon: system
                ? systemIcon(system.slug, system.platformSlug)
                : platformIcon(log.platform ?? ""),
        };
    };
};
