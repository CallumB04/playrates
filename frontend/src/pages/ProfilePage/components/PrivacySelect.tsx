import { ChevronDown, Globe, Lock, Users } from "lucide-react";
import type { ProfileVisibility } from "@playrates/shared";
import Dropdown from "../../../components/ui/Dropdown";

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
        hint: "Only people you're friends with",
    },
    { value: "private", label: "Only me", icon: Lock, hint: "Nobody else" },
] satisfies {
    value: ProfileVisibility;
    label: string;
    icon: typeof Globe;
    hint: string;
}[];

interface PrivacySelectProps {
    value: ProfileVisibility;
    onChange: (value: ProfileVisibility) => void;
    /** What it is the privacy of, for a screen reader: "Location". */
    field: string;
    disabled?: boolean;
}

/** Who sees one thing on a profile, as its icon alone: beside a value, a
 *  worded pill left the value too little room. The card carries a key. */
const PrivacySelect = ({
    value,
    onChange,
    field,
    disabled,
}: PrivacySelectProps) => (
    <Dropdown
        options={PRIVACY_OPTIONS}
        value={value}
        onChange={(next) => onChange(next as ProfileVisibility)}
        aria-label={`Who sees your ${field.toLowerCase()}: ${
            PRIVACY_OPTIONS.find((o) => o.value === value)?.label ?? ""
        }`}
        disabled={disabled}
        menuClassName="w-60"
        // Grown, not the glyph: the pill stays small and a thumb still finds it.
        triggerClassName="relative flex cursor-pointer items-center gap-0.5 rounded-full px-1.5 py-1 text-content-muted lift hover:bg-surface-hover hover:text-content before:absolute before:-inset-x-1.5 before:-inset-y-3 before:content-[''] focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-default"
        renderTrigger={(selected) => {
            const Icon = selected?.icon ?? Globe;
            return (
                <>
                    <Icon size={14} aria-hidden />
                    <ChevronDown size={10} aria-hidden />
                </>
            );
        }}
    />
);

export default PrivacySelect;
