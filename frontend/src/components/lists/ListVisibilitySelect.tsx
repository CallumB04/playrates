import { ChevronDown, Globe } from "lucide-react";
import type { GameListDetail, ProfileVisibility } from "@playrates/shared";
import Dropdown from "../ui/Dropdown";
import { useNotify } from "../../contexts/NotificationContext";
import { useUpdateList } from "../../hooks/queries/useLists";
import { PRIVACY_OPTIONS } from "../../pages/ProfilePage/components/PrivacySelect";

// The profile's wording, said of a list.
const HINTS: Record<ProfileVisibility, string> = {
    everyone: "Anyone who can see your profile",
    friends: "Only people you're friends with",
    private: "Nobody else",
};

const OPTIONS = PRIVACY_OPTIONS.map((option) => ({
    ...option,
    hint: HINTS[option.value],
}));

/** Who can see a list, changed from its own page: it saves as it's picked,
 *  rather than through the editor. */
const ListVisibilitySelect = ({ list }: { list: GameListDetail }) => {
    const notify = useNotify();
    const update = useUpdateList(list.id);

    return (
        <Dropdown
            options={OPTIONS}
            value={list.visibility}
            onChange={(next) =>
                update.mutate(
                    { visibility: next as ProfileVisibility },
                    {
                        onError: () =>
                            notify("Couldn't change who can see it", "error"),
                    }
                )
            }
            aria-label={`Who can see this list: ${
                OPTIONS.find((o) => o.value === list.visibility)?.label ?? ""
            }`}
            disabled={update.isPending}
            menuClassName="w-64"
            // Grown, not the glyph: the pill stays small and a thumb still finds it.
            triggerClassName="relative inline-flex cursor-pointer items-center gap-1 rounded-full bg-surface-sunken px-2 py-0.5 text-label-sm text-content-secondary lift hover:bg-surface-hover hover:text-content before:absolute before:-inset-x-1 before:-inset-y-3.5 before:content-[''] focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-default"
            renderTrigger={(selected) => {
                const Icon = selected?.icon ?? Globe;
                return (
                    <>
                        <Icon size={11} aria-hidden />
                        {selected?.label}
                        <ChevronDown size={11} aria-hidden />
                    </>
                );
            }}
        />
    );
};

export default ListVisibilitySelect;
