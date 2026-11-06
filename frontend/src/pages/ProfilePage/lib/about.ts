import {
    CalendarDays,
    Clock,
    Cake,
    Link2,
    MapPin,
    Speech,
    UserRound,
} from "lucide-react";
import { SiDiscord, SiSteam } from "@icons-pack/react-simple-icons";
import {
    AboutFieldsSchema,
    type AboutFact,
    type AboutField,
} from "@playrates/shared";
import type { IconComponent } from "../../../lib/icons";

export interface AboutRow {
    field: AboutField;
    label: string;
    icon: IconComponent;
    group: "about" | "socials";
    placeholder: string;
    type?: "url";
    /** Short enough to share a row with its neighbour where they're edited. */
    half?: true;
}

/** The About fields as a profile shows them, in its order: who someone is,
 *  then where else to find them. */
export const ABOUT_ROWS: AboutRow[] = [
    {
        field: "firstName",
        label: "Name",
        icon: UserRound,
        group: "about",
        placeholder: "Your first name",
        half: true,
    },
    {
        field: "pronouns",
        label: "Pronouns",
        icon: Speech,
        group: "about",
        placeholder: "they/them, she/her, he/him",
        half: true,
    },
    {
        field: "location",
        label: "Location",
        icon: MapPin,
        group: "about",
        placeholder: "Town or city, country",
    },
    {
        field: "website",
        label: "Website",
        icon: Link2,
        group: "socials",
        placeholder: "https://yoursite.com",
        type: "url",
    },
    {
        field: "discord",
        label: "Discord",
        icon: SiDiscord,
        group: "socials",
        placeholder: "Your username, not display name",
    },
    {
        field: "steam",
        label: "Steam",
        icon: SiSteam,
        group: "socials",
        placeholder: "Profile address or custom name",
    },
];

/** The About card's lines that aren't typed in: their labels, in order. */
export const ABOUT_FACT_ROWS: {
    fact: AboutFact;
    label: string;
    icon: IconComponent;
}[] = [
    { fact: "age", label: "Age", icon: Cake },
    { fact: "joined", label: "Joined", icon: CalendarDays },
    { fact: "lastSeen", label: "Last seen", icon: Clock },
];

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
});
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
});

/** "9 April 2019". */
export const joinedText = (iso: string): string =>
    LONG_DATE.format(new Date(iso));

/** When someone was last on, from the day the API gives (UTC): now, today,
 *  yesterday, else the day, with its year only when it isn't this one. */
export const lastSeenText = (
    day: string,
    online: boolean,
    today: string = new Date().toISOString().slice(0, 10)
): string => {
    if (online) return "Online now";
    if (day >= today) return "Today";
    const date = new Date(`${day}T00:00:00Z`);
    const yesterday = new Date(`${today}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    return day.slice(0, 4) === today.slice(0, 4)
        ? DAY_MONTH.format(date)
        : LONG_DATE.format(date);
};

/** The latest birthday Edit profile takes: 13 years ago today. */
export const latestBirthDate = (today = new Date()): string => {
    const d = new Date(today);
    d.setUTCFullYear(d.getUTCFullYear() - 13);
    return d.toISOString().slice(0, 10);
};

/** What is wrong with a field as typed, by the rule the server holds it to.
 *  The first name is not an About field there, so its one rule is here. */
export const aboutError = (
    field: AboutField,
    value: string
): string | undefined => {
    if (field === "firstName") {
        return value.trim().length > 40 ? "40 characters at most" : undefined;
    }
    const checked = AboutFieldsSchema.shape[field].safeParse(value.trim());
    return checked.success ? undefined : checked.error.issues[0]?.message;
};

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
