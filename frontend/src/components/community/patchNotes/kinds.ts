import { CircleDot, Sparkles, TrendingUp, Wrench } from "lucide-react";
import type { PatchNoteKind } from "@playrates/shared";
import type { IconComponent } from "../../../lib/icons";

/** How each kind of change looks: a mark and a tone of its own. */
export const KIND_STYLE: Record<
    PatchNoteKind,
    { icon: IconComponent; text: string; tint: string }
> = {
    feature: {
        icon: Sparkles,
        text: "text-brand-text",
        tint: "bg-brand-subtle",
    },
    improvement: {
        icon: TrendingUp,
        text: "text-info-content",
        tint: "bg-info-subtle",
    },
    fix: {
        icon: Wrench,
        text: "text-success-content",
        tint: "bg-success-subtle",
    },
    other: {
        icon: CircleDot,
        text: "text-content-secondary",
        tint: "bg-surface-sunken",
    },
};
