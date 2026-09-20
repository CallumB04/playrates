import Button, {
    BUTTON_VARIANTS,
    buttonClass,
    type ButtonVariant,
} from "../../../../../components/ui/Button";
import Chip from "../../../../../components/ui/Chip";
import Toggle from "../../../../../components/ui/Toggle";
import Pagination, {
    PaginationSummary,
} from "../../../../../components/ui/Pagination";
import ThemeToggle from "../../../../../components/ui/ThemeToggle";
import Specimen from "../../../components/Specimen";
import { usePagination } from "../../../../../hooks/usePagination";
import { useState } from "react";

const LABELS: Record<ButtonVariant, string> = {
    primary: "Log this game",
    secondary: "Edit log",
    outline: "Backlog",
    ghost: "Cancel",
    danger: "Delete log",
    bare: "Bare",
};

const PLATFORMS = [
    "All",
    "Steam",
    "PlayStation",
    "Xbox",
    "Switch",
    "PC Game Pass",
    "Other PC",
    "Mobile",
];

const ActionsSpecimens = () => {
    const [platform, setPlatform] = useState("All");
    const [hideLogged, setHideLogged] = useState(true);
    const [adult, setAdult] = useState(false);
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
                    <span className="font-mono text-label-sm uppercase text-content-muted">
                        Enabled
                    </span>
                    <span className="font-mono text-label-sm uppercase text-content-muted">
                        Disabled
                    </span>
                    {BUTTON_VARIANTS.map((variant) => (
                        <div key={variant} className="contents">
                            <span className="font-mono text-label-sm uppercase text-content-secondary">
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
                notes="touch is the 48px floor for anything that appears in the mobile sheet; md tightens from 44 to 40 where there is a pointer."
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
                notes="Filter chips. aria-pressed is the source of truth for both the semantics and the styling, so the two can't drift."
                meta="selected · dotClassName"
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
                meta='labelPosition="after" | "flanked" | "hidden"'
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
