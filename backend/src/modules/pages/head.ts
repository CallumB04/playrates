import { SITE_NAME, SITE_ORIGIN, type Crumb } from "@playrates/shared";
import type { PageBody } from "./body.js";

/** Everything a page says about itself before the app has run. */
export interface HeadMeta {
  /** The full title, site name included. */
  title: string;
  description: string;
  /** Path on the site, from its origin. */
  path: string;
  image: string;
  /** Said where the picture's own size is known; previews lay out sooner. */
  imageSize?: { width: number; height: number };
  /** A wide picture gets the large card; an avatar or a logo, the small. */
  card: "summary" | "summary_large_image";
  type?: "website" | "profile" | "article";
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
  /** Where it sits, as the trail over its title shows it. */
  breadcrumbs?: Crumb[];
  /** The content itself, for readers that never run the app. */
  body?: PageBody;
}

export const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-default.png`;
/** og-default.png, and the wide Gaming 25 picture. */
export const WIDE_IMAGE_SIZE = { width: 1200, height: 630 };

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** For text and attribute values alike. Titles and bios are written by
 *  users, and this is the one place they reach HTML outside React. */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ENTITIES[c]!);

/** JSON inside a <script> ends at the first "</script>", whatever JSON
 *  thinks, so < never appears raw. U+2028 and U+2029 are escaped for the
 *  engines that still treat them as line breaks in a string. */
export const jsonForScript = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const meta = (key: "name" | "property", name: string, content: string) =>
  `<meta ${key}="${name}" content="${escapeHtml(content)}" />`;

/** A trail as schema.org has it: alone in its script, or in a @graph. */
export const breadcrumbList = (trail: Crumb[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map((crumb, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: crumb.name,
    item: `${SITE_ORIGIN}${crumb.path}`,
  })),
});

export const buildHead = (m: HeadMeta): string => {
  const url = `${SITE_ORIGIN}${m.path}`;
  return [
    `<title>${escapeHtml(m.title)}</title>`,
    meta("name", "description", m.description),
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ...(m.noindex ? [meta("name", "robots", "noindex")] : []),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:type", m.type ?? "website"),
    meta("property", "og:title", m.title),
    meta("property", "og:description", m.description),
    meta("property", "og:url", url),
    meta("property", "og:image", m.image),
    // The page's title describes its picture well enough: a cover, an
    // avatar, the site's own card.
    meta("property", "og:image:alt", m.title),
    ...((m.imageSize ??
    (m.image === DEFAULT_IMAGE ? WIDE_IMAGE_SIZE : undefined))
      ? [
          meta(
            "property",
            "og:image:width",
            String((m.imageSize ?? WIDE_IMAGE_SIZE).width),
          ),
          meta(
            "property",
            "og:image:height",
            String((m.imageSize ?? WIDE_IMAGE_SIZE).height),
          ),
        ]
      : []),
    meta("name", "twitter:card", m.card),
    meta("name", "twitter:title", m.title),
    meta("name", "twitter:description", m.description),
    ...(m.jsonLd
      ? [
          `<script type="application/ld+json">${jsonForScript(m.jsonLd)}</script>`,
        ]
      : []),
    // Nothing for a search engine on a page asked to stay out of one.
    ...(m.breadcrumbs && !m.noindex
      ? [
          `<script type="application/ld+json">${jsonForScript({
            "@context": "https://schema.org",
            ...breadcrumbList(m.breadcrumbs),
          })}</script>`,
        ]
      : []),
  ].join("\n        ");
};

const START = "<!-- head:start -->";
const END = "<!-- head:end -->";

/** Swaps the default block in the built index.html for this page's. A
 *  template without the markers is returned as it came: the page still
 *  works, it only previews as the homepage. */
export const injectHead = (template: string, head: string): string => {
  const start = template.indexOf(START);
  const end = template.indexOf(END, start);
  if (start === -1 || end === -1) return template;
  return (
    template.slice(0, start + START.length) +
    `\n        ${head}\n        ` +
    template.slice(end)
  );
};
