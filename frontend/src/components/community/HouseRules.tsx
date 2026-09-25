import { EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

const RULES = [
    { text: "Be kind." },
    {
        text: "Hide spoilers with the spoiler button",
        icon: EyeOff,
        after: " in the toolbar.",
    },
    { text: "Keep messages relevant to the game." },
];

/** Where they matter: in the form, before anything is posted. */
const HouseRules = ({ className }: { className?: string }) => (
    <section
        aria-labelledby="house-rules"
        className={cn(
            "rounded-md border border-dashed border-strong px-4 py-3",
            className
        )}
    >
        <h2 id="house-rules" className="text-label text-content-muted">
            House rules
        </h2>
        <ul className="mt-2 flex flex-col gap-1 text-body-sm text-content-secondary">
            {RULES.map((rule) => (
                <li key={rule.text} className="flex gap-2">
                    <span aria-hidden className="text-content-muted">
                        ·
                    </span>
                    <span>
                        {rule.text}
                        {rule.icon && (
                            <rule.icon
                                size={13}
                                aria-hidden
                                className="mx-1 inline -translate-y-px"
                            />
                        )}
                        {rule.after}
                    </span>
                </li>
            ))}
        </ul>
    </section>
);

export default HouseRules;
