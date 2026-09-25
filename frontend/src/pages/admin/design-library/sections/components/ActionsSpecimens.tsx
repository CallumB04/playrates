import { useState } from "react";
import { Archive, Inbox, Monitor, Moon, Sun } from "lucide-react";
import Button, {
    BUTTON_VARIANTS,
    buttonClass,
    type ButtonVariant,
} from "../../../../../components/ui/Button";
import Toggle from "../../../../../components/ui/Toggle";
import Chip from "../../../../../components/ui/Chip";
import SegmentedChoice from "../../../../../components/ui/SegmentedChoice";
import VoteButton from "../../../../../components/ui/VoteButton";
import Pagination, {
    PaginationSummary,
} from "../../../../../components/ui/Pagination";
import ThemeToggle from "../../../../../components/ui/ThemeToggle";
import Specimen from "../../../components/Specimen";
import { usePagination } from "../../../../../hooks/usePagination";
import { whyCannotVote } from "../../../../../lib/voting";

const LABELS: Record<ButtonVariant, string> = {
    primary: "Log this game",
    secondary: "Edit log",
    outline: "Backlog",
    ghost: "Cancel",
    danger: "Delete log",
    bare: "Bare",
};

/* A filter bar's worth, so the row wraps the way a real one would. */
const PLATFORMS = ["All", "Steam", "PlayStation", "Xbox", "Switch", "Mobile"];

const ActionsSpecimens = () => {
    const [platform, setPlatform] = useState("All");
    const [hideLogged, setHideLogged] = useState(true);
    const [adult, setAdult] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
    const [tab, setTab] = useState<"inbox" | "archive">("inbox");
    const [voted, setVoted] = useState(false);
    const [page, setPage] = useState(1);
    const pagination = usePagination({
        total: 184662,
        perPage: 28,
        page,
        onPageChange: setPage,
    });

    return (
        <>
            <Specimen
                title="Buttons"
                stack
                notes="Rest, hover, pressed and disabled. The state is a shadow swap, not a colour swap — pressed inverts to an inset. Hover and press the live buttons to see it; every stateful control in the system shares this one gesture."
                meta='variant="primary" | "secondary" | "outline" | "ghost" | "danger" | "bare" · size="sm" | "md" | "lg" | "touch"'
            >
                <div className="grid w-full grid-cols-[110px_1fr_1fr] items-center gap-3">
                    <span />
                    <span className="text-label-sm text-content-muted">
                        Enabled
                    </span>
                    <span className="text-label-sm text-content-muted">
                        Disabled
                    </span>
                    {BUTTON_VARIANTS.map((variant) => (
                        <div key={variant} className="contents">
                            <span className="text-label-sm text-content-secondary">
                                {variant}
                            </span>
                            <Button variant={variant}>{LABELS[variant]}</Button>
                            <Button variant={variant} disabled>
                                {LABELS[variant]}
                            </Button>
                        </div>
                    ))}
                </div>
            </Specimen>

            <Specimen
                title="Button sizes"
                notes="md is 44px on a phone and tightens to 40 where there is a pointer; touch is the 48px floor for the mobile sheet. sm is 36px, so it belongs on desktop-only surfaces."
                meta="buttonClass(variant, className, size) — for Links and anything else that can't be a <button>"
            >
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="touch">Touch</Button>
                <a href="#demo" className={buttonClass("secondary")}>
                    A link
                </a>
            </Specimen>

            <Specimen
                title="Chips"
                notes="Filter chips. aria-pressed is the source of truth for both the semantics and the styling, so the two can't drift. chipClass is the same skin for a chip that has to be a link — the home page's shelf shortcuts navigate rather than filter."
                meta="selected · dotClassName — chipClass(selected, className)"
            >
                {PLATFORMS.map((name) => (
                    <Chip
                        key={name}
                        selected={platform === name}
                        onClick={() => setPlatform(name)}
                        dotClassName={
                            platform === name
                                ? "bg-content-on-solid"
                                : "bg-content-muted"
                        }
                    >
                        {name}
                    </Chip>
                ))}
            </Specimen>

            <Specimen
                title="Toggles"
                stack
                notes="Off is a pressed well, on is a brand plate — the press gesture again, so it reads without the colour. role=switch with aria-checked."
                meta='labelPosition="after" | "flanked" | "hidden" · ThemeToggle'
            >
                <Toggle
                    checked={hideLogged}
                    onChange={setHideLogged}
                    label="Hide games I've logged"
                />
                <Toggle
                    checked={adult}
                    onChange={setAdult}
                    label="Show adult content"
                />
                <ThemeToggle />
            </Specimen>

            <Specimen
                title="Segmented choice"
                stack
                notes="A short, fixed set where seeing every option beats opening a menu. The selected segment is flat — an inset rim along its top edge alone made it read a shade shorter than its neighbours. Segments reach 44px below sm. fill splits the width equally, for a control that spans its container."
                meta="segments · value · onChange · label · fill"
            >
                <SegmentedChoice
                    label="Theme"
                    segments={[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Monitor },
                    ]}
                    value={theme}
                    onChange={setTheme}
                />
                <div className="w-full max-w-sm">
                    <SegmentedChoice
                        label="Which notifications to show"
                        segments={[
                            { value: "inbox", label: "Inbox", icon: Inbox },
                            {
                                value: "archive",
                                label: "Archive",
                                icon: Archive,
                            },
                        ]}
                        value={tab}
                        onChange={setTab}
                        fill
                    />
                </div>
            </Specimen>

            <Specimen
                title="Vote button"
                notes="The count is the label, so the whole pill is one touch target; pressing again withdraws the vote. When the viewer can't vote it still shows the tally, and says why instead of just greying out — signed out, or the review is their own, which the API refuses too."
                meta="count · voted · onToggle · disabledReason — whyCannotVote(viewerId, authorId)"
            >
                <VoteButton
                    count={voted ? 13 : 12}
                    voted={voted}
                    onToggle={() => setVoted((v) => !v)}
                />
                <VoteButton count={4} voted onToggle={() => {}} />
                <VoteButton
                    count={12}
                    voted={false}
                    onToggle={() => {}}
                    disabledReason={whyCannotVote(undefined, "author")}
                />
                <VoteButton
                    count={3}
                    voted={false}
                    onToggle={() => {}}
                    disabledReason={whyCannotVote("author", "author")}
                />
            </Specimen>

            <Specimen
                title="Pagination"
                stack
                notes="Numbered, with gaps elided. The window keeps a constant width wherever you are in the range, so the control doesn't jump about as you page. A gap of exactly one page is never elided — the ellipsis costs the same room as the number."
                meta="pageRange(page, pageCount, siblings) · PaginationSummary"
            >
                <PaginationSummary pagination={pagination} />
                <Pagination pagination={pagination} />
            </Specimen>
        </>
    );
};

export default ActionsSpecimens;
