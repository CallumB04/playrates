import { Eye, Flame, ListChecks, Target, Trophy } from "lucide-react";
import type { EventBadgeIcon } from "@playrates/shared";

export const EVENT_BADGE_ICONS: Record<EventBadgeIcon, typeof Trophy> = {
    ballot: ListChecks,
    trophy: Trophy,
    target: Target,
    eye: Eye,
    flame: Flame,
};
