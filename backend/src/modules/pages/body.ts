import { escapeHtml } from "./head.js";

/**
 * A page's content as plain HTML, for whatever reads the page without
 * running it: most AI crawlers fetch the HTML and stop there, and an empty
 * #root told them nothing about the game. The app replaces it on mount
 * (createRoot clears its container), so a person sees the app as before.
 */
export interface PageBody {
  heading: string;
  /** A line under the heading. */
  lead?: string;
  facts?: { label: string; value: string }[];
  /** Paragraphs of prose: a description, a bio, an opening post. */
  text?: string[];
  sections?: {
    heading: string;
    items: { title: string; meta?: string; text?: string }[];
  }[];
  links?: { href: string; label: string }[];
}

/** Long enough to carry a review's point, short enough not to be the page. */
const EXCERPT = 600;

export const excerpt = (text: string, max = EXCERPT): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max)}…`;
};

export const toParagraphs = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

export const buildBody = (b: PageBody): string => {
  const e = escapeHtml;
  const parts = [`<h1>${e(b.heading)}</h1>`];
  if (b.lead) parts.push(`<p>${e(b.lead)}</p>`);
  if (b.facts?.length) {
    parts.push(
      `<dl>${b.facts.map((f) => `<dt>${e(f.label)}</dt><dd>${e(f.value)}</dd>`).join("")}</dl>`,
    );
  }
  for (const p of b.text ?? []) parts.push(`<p>${e(p)}</p>`);
  for (const section of b.sections ?? []) {
    if (!section.items.length) continue;
    const items = section.items.map(
      (item) =>
        `<li><p><strong>${e(item.title)}</strong>${
          item.meta ? ` · ${e(item.meta)}` : ""
        }</p>${item.text ? `<p>${e(item.text)}</p>` : ""}</li>`,
    );
    parts.push(
      `<section><h2>${e(section.heading)}</h2><ul>${items.join("")}</ul></section>`,
    );
  }
  if (b.links?.length) {
    parts.push(
      `<nav>${b.links.map((l) => `<a href="${e(l.href)}">${e(l.label)}</a>`).join(" · ")}</nav>`,
    );
  }
  return `<article class="prerender">${parts.join("")}</article>`;
};

const ROOT = '<div id="root"></div>';

/** Fills the app's empty root. A template without one is returned as it
 *  came: the page still works, it only reads as empty without scripts. */
export const injectBody = (template: string, body: string): string =>
  template.includes(ROOT)
    ? template.replace(ROOT, `<div id="root">${body}</div>`)
    : template;
