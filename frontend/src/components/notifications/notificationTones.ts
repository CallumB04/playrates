/** The colour a notification wears: its icon, and while it's unread, the
 *  wash behind its row and the dot beside it. */
export type NotificationTone =
    "brand" | "love" | "accent" | "info" | "warning" | "gold" | "neutral";

export const NOTIFICATION_TONES: Record<
    NotificationTone,
    { icon: string; wash: string; dot: string }
> = {
    brand: {
        icon: "text-brand-text",
        wash: "bg-brand-subtle/60",
        dot: "bg-brand",
    },
    love: { icon: "text-love", wash: "bg-love-quiet/60", dot: "bg-love" },
    accent: {
        icon: "text-accent",
        wash: "bg-accent-quiet/60",
        dot: "bg-accent",
    },
    info: { icon: "text-info", wash: "bg-info-subtle/60", dot: "bg-info" },
    warning: {
        icon: "text-warning",
        wash: "bg-warning-subtle/60",
        dot: "bg-warning",
    },
    gold: { icon: "text-gold", wash: "bg-gold-quiet/60", dot: "bg-gold" },
    neutral: {
        icon: "text-content-muted",
        wash: "bg-surface-sunken/60",
        dot: "bg-strong",
    },
};
