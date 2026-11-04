/** The colour a notification wears: its icon, and while it's unread, the
 *  wash behind its row and the rule down its edge. */
export type NotificationTone =
    "brand" | "love" | "accent" | "info" | "warning" | "gold" | "neutral";

export const NOTIFICATION_TONES: Record<
    NotificationTone,
    { icon: string; unread: string; rule: string }
> = {
    brand: {
        icon: "text-brand-text",
        unread: "bg-brand-subtle/50",
        rule: "bg-brand",
    },
    love: { icon: "text-love", unread: "bg-love-quiet/50", rule: "bg-love" },
    accent: {
        icon: "text-accent",
        unread: "bg-accent-quiet/50",
        rule: "bg-accent",
    },
    info: { icon: "text-info", unread: "bg-info-subtle/50", rule: "bg-info" },
    warning: {
        icon: "text-warning",
        unread: "bg-warning-subtle/50",
        rule: "bg-warning",
    },
    gold: { icon: "text-gold", unread: "bg-gold-quiet/50", rule: "bg-gold" },
    neutral: {
        icon: "text-content-muted",
        unread: "bg-surface-sunken/50",
        rule: "bg-strong",
    },
};
