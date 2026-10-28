export type ShareTarget =
    "x" | "bluesky" | "threads" | "reddit" | "whatsapp" | "facebook";

export interface ShareLink {
    target: ShareTarget;
    label: string;
    href: string;
}

const q = (params: Record<string, string>) =>
    new URLSearchParams(params).toString();

/**
 * Each network's own "post this" page, with the text and link filled in.
 * Instagram and TikTok have none: they take the picture, through the
 * phone's share sheet or a download.
 */
export const shareLinks = (url: string, text: string): ShareLink[] => [
    {
        target: "x",
        label: "X",
        href: `https://x.com/intent/post?${q({ text, url })}`,
    },
    {
        target: "bluesky",
        label: "Bluesky",
        href: `https://bsky.app/intent/compose?${q({ text: `${text} ${url}` })}`,
    },
    {
        target: "threads",
        label: "Threads",
        href: `https://www.threads.net/intent/post?${q({ text: `${text} ${url}` })}`,
    },
    {
        target: "reddit",
        label: "Reddit",
        href: `https://www.reddit.com/submit?${q({ url, title: text })}`,
    },
    {
        target: "whatsapp",
        label: "WhatsApp",
        href: `https://wa.me/?${q({ text: `${text} ${url}` })}`,
    },
    {
        target: "facebook",
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?${q({ u: url })}`,
    },
];
