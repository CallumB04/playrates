/** Inboxes worth a shortcut, by the address's domain: most new accounts are
 *  one of these, and a tap straight to it beats finding the app. */
const INBOXES: { domains: string[]; label: string; href: string }[] = [
    {
        domains: ["gmail.com", "googlemail.com"],
        label: "Open Gmail",
        href: "https://mail.google.com/mail/u/0/#inbox",
    },
    {
        domains: [
            "outlook.com",
            "hotmail.com",
            "hotmail.co.uk",
            "live.com",
            "live.co.uk",
            "msn.com",
        ],
        label: "Open Outlook",
        href: "https://outlook.live.com/mail/",
    },
    {
        domains: ["yahoo.com", "yahoo.co.uk", "ymail.com"],
        label: "Open Yahoo Mail",
        href: "https://mail.yahoo.com/",
    },
    {
        domains: ["icloud.com", "me.com", "mac.com"],
        label: "Open iCloud Mail",
        href: "https://www.icloud.com/mail",
    },
    {
        domains: ["proton.me", "protonmail.com", "pm.me"],
        label: "Open Proton Mail",
        href: "https://mail.proton.me/",
    },
];

export const inboxFor = (
    email: string
): { label: string; href: string } | null => {
    const domain = email.split("@")[1]?.trim().toLowerCase();
    const inbox = INBOXES.find((i) => domain && i.domains.includes(domain));
    return inbox ? { label: inbox.label, href: inbox.href } : null;
};

/** The query param a confirmation link comes back with, so the page can say
 *  it worked. Supabase signs the visitor in on the way. */
export const CONFIRMED_PARAM = "confirmed";

/**
 * What an emailed link came back to say: confirmed, or that it had run out
 * or been used. Supabase puts its errors in the hash.
 */
export const readAuthLinkResult = (
    search: string,
    hash: string
): "confirmed" | "expired" | "failed" | null => {
    const error = new URLSearchParams(hash.replace(/^#/, ""));
    if (error.get("error")) {
        return error.get("error_code") === "otp_expired" ? "expired" : "failed";
    }
    return new URLSearchParams(search).get(CONFIRMED_PARAM)
        ? "confirmed"
        : null;
};
