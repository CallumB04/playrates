/**
 * Links written into an announcement's message, markdown style:
 * `[what it says](where it goes)`. The message is otherwise plain text.
 */
const LINK = /\[([^\]\n]+)\]\(([^()\s]+)\)/g;

export interface AnnouncementBodyPart {
  text: string;
  href?: string;
}

/** https anywhere, or a path on PlayRates. Protocol-relative ("//host") would
 *  leave the site while reading as a path. */
export const isAnnouncementHref = (href: string): boolean =>
  /^https:\/\/[^\s/?#]+/.test(href) || /^\/(?!\/)\S*$/.test(href);

export const isExternalHref = (href: string): boolean =>
  href.startsWith("https://");

/** A link to anywhere else stays as it was written, so nothing is hidden
 *  behind words the reader can't check. */
export const parseAnnouncementBody = (body: string): AnnouncementBodyPart[] => {
  const parts: AnnouncementBodyPart[] = [];
  let last = 0;
  for (const match of body.matchAll(LINK)) {
    const [raw, text = "", href = ""] = match;
    const at = match.index ?? 0;
    if (!isAnnouncementHref(href)) continue;
    if (at > last) parts.push({ text: body.slice(last, at) });
    parts.push({ text, href });
    last = at + raw.length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
};

/** What the reader sees, which is what the length limit is about: an address
 *  takes no room in the bell. */
export const announcementBodyText = (body: string): string =>
  parseAnnouncementBody(body)
    .map((part) => part.text)
    .join("");

export const announcementBodyBadLinks = (body: string): string[] =>
  [...body.matchAll(LINK)]
    .map((match) => match[2] ?? "")
    .filter((href) => !isAnnouncementHref(href));
