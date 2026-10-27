import { Link2, MapPin, Speech, UserRound } from "lucide-react";
import { SiDiscord, SiSteam } from "@icons-pack/react-simple-icons";
import type { AboutField } from "@playrates/shared";
import type { IconComponent } from "../../../lib/icons";

/** The About fields as a profile shows them, in its order: who someone is,
 *  then where else to find them. */
export const ABOUT_ROWS: {
    field: AboutField;
    label: string;
    icon: IconComponent;
    group: "about" | "socials";
}[] = [
    { field: "firstName", label: "Name", icon: UserRound, group: "about" },
    { field: "pronouns", label: "Pronouns", icon: Speech, group: "about" },
    { field: "location", label: "Location", icon: MapPin, group: "about" },
    { field: "website", label: "Website", icon: Link2, group: "socials" },
    { field: "discord", label: "Discord", icon: SiDiscord, group: "socials" },
    { field: "steam", label: "Steam", icon: SiSteam, group: "socials" },
];

/** A web address as a link reads it: no scheme, no www, no trailing slash. */
export const linkLabel = (url: string): string =>
    url
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/$/, "");

/** A Steam profile by its custom name, where it has one; a numbered one
 *  says nothing worth reading, so it is just "Steam". */
export const steamLabel = (url: string): string =>
    /\/id\/([^/]+)$/.exec(url)?.[1] ?? "Steam profile";

/** The list with one item moved to another place, the rest in order. */
export const moveItem = <T>(list: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    return next;
};

const PODIUM = ["text-medal-gold", "text-medal-silver", "text-medal-bronze"];

/** A favourite's place as a colour: gold, silver and bronze for the top
 *  three, the rest left plain. Places count from 1. */
export const rankTone = (place: number): string =>
    PODIUM[place - 1] ?? "text-content-muted";

/** A phone shows a ranked row's podium only: three across, where five
 *  wrapped two onto a second row. */
export const podiumOnPhone = (place: number): string | undefined =>
    place > PODIUM.length ? "max-sm:hidden" : undefined;
