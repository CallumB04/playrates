import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/cn";

/* One line by default. A game with eight genres wrapped to four, which pushed
   the rest of the ledger down and left the label stranded beside a block. */
const InlineNameList = ({
    names,
    noun,
}: {
    names: string[];
    /** Plural, for the expander: "Show all genres", "Show all developers". */
    noun: string;
}) => {
    const [open, setOpen] = useState(false);

    return (
        <span className="flex min-w-0 items-baseline gap-1.5">
            <span className={cn("min-w-0", open ? "text-right" : "truncate")}>
                {names.join(" · ")}
            </span>
            {names.length > 1 && (
                <button
                    type="button"
                    onClick={() => setOpen((was) => !was)}
                    aria-expanded={open}
                    aria-label={
                        open ? `Show fewer ${noun}` : `Show all ${noun}`
                    }
                    className="relative shrink-0 cursor-pointer self-center text-content-muted before:absolute before:-inset-4 before:content-[''] hover:text-content sm:before:hidden"
                >
                    <ChevronDown
                        size={13}
                        aria-hidden
                        className={cn(
                            "transition-transform duration-200",
                            open && "rotate-180"
                        )}
                    />
                </button>
            )}
        </span>
    );
};

export default InlineNameList;
