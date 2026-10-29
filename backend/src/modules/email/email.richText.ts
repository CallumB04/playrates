import {
  EMAIL_COLOURS,
  SPOILER_PLACEHOLDER,
  emailParagraph,
  escapeHtml,
  type RichTextBlock,
  type RichTextDoc,
  type RichTextInline,
} from "@playrates/shared";

const C = EMAIL_COLOURS;
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const HEADING_SIZES = { 1: [20, 28], 2: [18, 26], 3: [16, 24] } as const;

const isList = (
  block: RichTextBlock,
): block is Extract<RichTextBlock, { type: "bulletList" | "orderedList" }> =>
  block.type === "bulletList" || block.type === "orderedList";

const isSpoiler = (node: RichTextInline) =>
  node.type === "text" && (node.marks ?? []).some((m) => m.type === "spoiler");

/** A mail app can't hide and reveal, so a spoiler is left out as it is
 *  anywhere else the reader hasn't chosen to open it. */
const inlineHtml = (nodes: RichTextInline[] = []): string => {
  let html = "";
  let inSpoiler = false;
  for (const node of nodes) {
    if (isSpoiler(node)) {
      if (!inSpoiler) html += escapeHtml(SPOILER_PLACEHOLDER);
      inSpoiler = true;
      continue;
    }
    inSpoiler = false;
    if (node.type === "hardBreak") {
      html += "<br>";
      continue;
    }
    let text = escapeHtml(node.text);
    for (const { type } of node.marks ?? []) {
      if (type === "bold") text = `<strong>${text}</strong>`;
      if (type === "italic") text = `<em>${text}</em>`;
      if (type === "underline") text = `<u>${text}</u>`;
    }
    html += text;
  }
  return html;
};

const inlineText = (nodes: RichTextInline[] = []): string => {
  let text = "";
  let inSpoiler = false;
  for (const node of nodes) {
    if (isSpoiler(node)) {
      if (!inSpoiler) text += SPOILER_PLACEHOLDER;
      inSpoiler = true;
      continue;
    }
    inSpoiler = false;
    text += node.type === "text" ? node.text : "\n";
  }
  return text;
};

const listHtml = (
  block: Extract<RichTextBlock, { type: "bulletList" | "orderedList" }>,
): string => {
  const tag = block.type === "bulletList" ? "ul" : "ol";
  const start =
    block.type === "orderedList" && block.attrs?.start && block.attrs.start !== 1
      ? ` start="${block.attrs.start}"`
      : "";
  const items = block.content
    .map((item) => {
      // A paragraph inside an item is a line, not a spaced-out block.
      const inner = item.content
        .map((b) =>
          b.type === "paragraph" || b.type === "heading"
            ? inlineHtml(b.content)
            : blockHtml(b),
        )
        .filter((html) => html.length > 0)
        .join("<br>");
      return `<li style="margin:0 0 6px;">${inner}</li>`;
    })
    .join("");
  return `<${tag}${start} class="text" style="margin:0 0 16px;padding-left:24px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body};">${items}</${tag}>`;
};

const blockHtml = (block: RichTextBlock): string => {
  switch (block.type) {
    case "paragraph": {
      const html = inlineHtml(block.content);
      return html.trim() ? emailParagraph(html) : "";
    }
    case "heading": {
      const [size, line] = HEADING_SIZES[block.attrs.level];
      const tag = `h${block.attrs.level + 1}`;
      return `<${tag} class="strong" style="margin:24px 0 10px;font-family:${SANS};font-size:${size}px;line-height:${line}px;font-weight:700;color:${C.ink};">${inlineHtml(block.content)}</${tag}>`;
    }
    case "image":
      // Pictures are left to the site; the words say what one showed.
      return block.attrs.alt
        ? emailParagraph(`<em>${escapeHtml(block.attrs.alt)}</em>`)
        : "";
    default:
      return isList(block) ? listHtml(block) : "";
  }
};

const blockText = (block: RichTextBlock, indent = ""): string => {
  if (block.type === "image") return block.attrs.alt ? `${indent}${block.attrs.alt}` : "";
  if (isList(block)) {
    const first = block.type === "orderedList" ? (block.attrs?.start ?? 1) : 1;
    return block.content
      .map((item, i) => {
        const marker = block.type === "orderedList" ? `${first + i}. ` : "- ";
        const lines = item.content
          .map((b) => blockText(b, `${indent}  `).trimStart())
          .filter((line) => line.length > 0);
        return `${indent}${marker}${lines.join(`\n${indent}  `)}`;
      })
      .join("\n");
  }
  return `${indent}${inlineText(block.content)}`;
};

export interface RichTextRenderOptions {
  /** Left out: an entry's first heading, already the email's title. */
  skipFirstHeading?: boolean;
}

const blocksOf = (doc: RichTextDoc, { skipFirstHeading }: RichTextRenderOptions) => {
  if (!skipFirstHeading) return doc.content;
  const at = doc.content.findIndex((b) => b.type === "heading");
  return at === -1 ? doc.content : doc.content.filter((_, i) => i !== at);
};

/** A community message as email HTML: every value escaped, every style
 *  inline, as mail apps need. */
export const richTextToEmailHtml = (
  doc: RichTextDoc,
  options: RichTextRenderOptions = {},
): string => blocksOf(doc, options).map(blockHtml).join("\n");

/** The same, for the plain-text part. */
export const richTextToEmailText = (
  doc: RichTextDoc,
  options: RichTextRenderOptions = {},
): string[] =>
  blocksOf(doc, options)
    .map((block) => blockText(block))
    .filter((text) => text.trim().length > 0)
    .flatMap((text, i) => (i === 0 ? [text] : ["", text]));
