import { Globe, Lock, Users } from "lucide-react";
import type { ProfileVisibility } from "@playrates/shared";

export const PRIVACY_OPTIONS = [
    {
        value: "everyone",
        label: "Everyone",
        icon: Globe,
        hint: "Anyone who opens your profile",
    },
    {
        value: "friends",
        label: "Friends",
        icon: Users,
        hint: "Only people you’re friends with",
    },
    { value: "private", label: "Only me", icon: Lock, hint: "Nobody else" },
] satisfies {
    value: ProfileVisibility;
    label: string;
    icon: typeof Globe;
    hint: string;
}[];
