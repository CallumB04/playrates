import type { PlayedStatusFilter as Filter } from "@playrates/shared";
import Dropdown from "../../../components/ui/Dropdown";
import {
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";

/** "" is every played log; "none" is the ones carrying no substatus, which is
 *  a state of its own rather than the absence of an answer.
 *
 *  No hints: a filter is picked by the word, and the log editor already
 *  explains what each ending means at the point of choosing one. */
const OPTIONS = [
    { value: "", label: "All played" },
    {
        value: "none",
        label: STATUS_PRESENTATION.played.label,
        icon: STATUS_PRESENTATION.played.icon,
    },
    ...PLAYED_STATUSES.map((status) => ({
        value: status,
        label: STATUS_PRESENTATION[status].label,
        icon: STATUS_PRESENTATION[status].icon,
    })),
];

interface PlayedStatusFilterProps {
    value: Filter | undefined;
    onChange: (value: Filter | undefined) => void;
}

/** Narrows the played shelf to one ending. Only shown on that tab — no other
 *  status carries a substatus. */
const PlayedStatusFilter = ({ value, onChange }: PlayedStatusFilterProps) => (
    <Dropdown
        options={OPTIONS}
        value={value ?? ""}
        onChange={(next) => onChange((next || undefined) as Filter | undefined)}
        aria-label="Filter by how it ended"
        className="min-w-0 flex-1 sm:w-40 sm:flex-none"
    />
);

export default PlayedStatusFilter;
