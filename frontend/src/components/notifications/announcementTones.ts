import {
    Info,
    Megaphone,
    PartyPopper,
    TriangleAlert,
    type LucideIcon,
} from "lucide-react";
import type { AnnouncementTone } from "@playrates/shared";
import type { NotificationTone } from "./notificationTones";

/** How each announcement tone looks in the bell, and in the composer that
 *  picks one. */
export const ANNOUNCEMENT_PRESENTATION: Record<
    AnnouncementTone,
    { label: string; hint: string; icon: LucideIcon; tone: NotificationTone }
> = {
    update: {
        label: "Update",
        hint: "Something new on PlayRates",
        icon: Megaphone,
        tone: "brand",
    },
    info: {
        label: "Info",
        hint: "Worth knowing, nothing to do",
        icon: Info,
        tone: "info",
    },
    warning: {
        label: "Heads up",
        hint: "Downtime, a change that needs action",
        icon: TriangleAlert,
        tone: "warning",
    },
    celebration: {
        label: "Celebration",
        hint: "A milestone, a thank-you",
        icon: PartyPopper,
        tone: "gold",
    },
};
