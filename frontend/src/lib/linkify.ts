export type LinkifiedPart = string | { href: string; text: string };

/* Web addresses with a scheme, bare domains on the endings people actually
   write out (playrates.app, steam.com), and email addresses. A full
   public-suffix list would also turn "v1.0" or "e.g." into links. */
const TLDS = "app|com|net|org|io|gg|dev|co|uk|tv|me|games|xyz";
const PATTERN = new RegExp(
    [
        `(?<email>[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)*\\.[a-z]{2,})`,
        `(?<url>https?:\\/\\/[^\\s<]+)`,
        `(?<domain>\\b(?:[a-z0-9-]+\\.)+(?:${TLDS})\\b(?:\\/[^\\s<]*)?)`,
    ].join("|"),
    "gi"
);

// A sentence's full stop or a closing bracket is the sentence's, not the
// link's.
const TRAILING = /[.,;:!?)\]'"]+$/;

/** Splits text into plain runs and the links inside it. */
export const linkify = (text: string): LinkifiedPart[] => {
    const parts: LinkifiedPart[] = [];
    let last = 0;

    for (const match of text.matchAll(PATTERN)) {
        const found = match[0].replace(TRAILING, "");
        const start = match.index ?? 0;
        if (start > last) parts.push(text.slice(last, start));

        const { email, url } = match.groups ?? {};
        const href = email
            ? `mailto:${found}`
            : url
              ? found
              : `https://${found}`;
        parts.push({ href, text: found });
        last = start + found.length;
    }

    if (last < text.length) parts.push(text.slice(last));
    return parts;
};
