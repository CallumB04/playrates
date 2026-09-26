import { z } from "zod";

/**
 * The rich text a community message is written in: Tiptap's document JSON,
 * narrowed to what the editor offers: paragraphs, three heading levels,
 * pictures, bulleted and numbered lists, and bold, italic, underline and
 * spoiler marks. Anything outside the allowlist is
 * refused rather than stripped, so a message is never stored as something
 * other than what its author saw. Unknown *attributes* on known nodes are
 * dropped, since Tiptap adds nullable ones (alt, title) of its own accord.
 */

export const RICH_TEXT_MAX_CHARS = 10_000;
export const RICH_TEXT_MAX_IMAGES = 6;
/** Blocks in all, those inside lists included. */
const MAX_BLOCKS = 300;

const MarkSchema = z.object({
  /** A spoiler is hidden until the reader asks for it. */
  type: z.enum(["bold", "italic", "underline", "spoiler"]),
});

const TextNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(MarkSchema).max(4).optional(),
});

const HardBreakSchema = z.object({ type: z.literal("hardBreak") });

const InlineSchema = z.discriminatedUnion("type", [
  TextNodeSchema,
  HardBreakSchema,
]);

const ParagraphSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(InlineSchema).optional(),
});

const HeadingSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  content: z.array(InlineSchema).optional(),
});

const ImageSchema = z.object({
  type: z.literal("image"),
  attrs: z.object({
    src: z
      .string()
      .url()
      .max(500)
      .refine((src) => src.startsWith("https://"), "Images must be https"),
    alt: z.string().max(300).nullish(),
  }),
});

export type RichTextMark = z.infer<typeof MarkSchema>;
export type RichTextInline = z.infer<typeof InlineSchema>;

/** A list item holds blocks, so a list can hold a paragraph, a picture or
 *  another list. */
export interface RichTextListItem {
  type: "listItem";
  content: RichTextBlock[];
}

export type RichTextBlock =
  | z.infer<typeof ParagraphSchema>
  | z.infer<typeof HeadingSchema>
  | z.infer<typeof ImageSchema>
  | { type: "bulletList"; content: RichTextListItem[] }
  | {
      type: "orderedList";
      attrs?: { start?: number | null };
      content: RichTextListItem[];
    };

export interface RichTextDoc {
  type: "doc";
  content: RichTextBlock[];
}

// Lazy, because a list's items hold blocks and blocks include lists.
const BlockSchema: z.ZodType<RichTextBlock, z.ZodTypeDef, unknown> = z.lazy(
  () =>
    z.discriminatedUnion("type", [
      ParagraphSchema,
      HeadingSchema,
      ImageSchema,
      BulletListSchema,
      OrderedListSchema,
    ]),
);

const ListItemSchema = z.object({
  type: z.literal("listItem"),
  content: z.array(BlockSchema).min(1),
});

const BulletListSchema = z.object({
  type: z.literal("bulletList"),
  content: z.array(ListItemSchema).min(1),
});

const OrderedListSchema = z.object({
  type: z.literal("orderedList"),
  attrs: z
    .object({ start: z.number().int().min(0).max(100_000).nullish() })
    .optional(),
  content: z.array(ListItemSchema).min(1),
});

/** Lists inside lists, this deep and no deeper. */
const MAX_LIST_DEPTH = 4;

const isList = (
  block: RichTextBlock,
): block is Extract<RichTextBlock, { type: "bulletList" | "orderedList" }> =>
  block.type === "bulletList" || block.type === "orderedList";

/** Every block, including those inside lists, with how many lists deep. */
const eachBlock = function* (
  blocks: RichTextBlock[],
  depth = 0,
): Generator<{ block: RichTextBlock; depth: number }> {
  for (const block of blocks) {
    yield { block, depth };
    if (isList(block)) {
      for (const item of block.content) {
        yield* eachBlock(item.content, depth + 1);
      }
    }
  }
};

export const SPOILER_PLACEHOLDER = "[spoiler]";

const isSpoiler = (node: RichTextInline): boolean =>
  node.type === "text" &&
  (node.marks ?? []).some((mark) => mark.type === "spoiler");

const blockText = (block: RichTextBlock, hideSpoilers = false): string => {
  if (block.type === "image") return "";
  if (isList(block)) {
    // One line per item, so a list quotes as it reads.
    return block.content
      .map((item) =>
        item.content
          .map((inner) => blockText(inner, hideSpoilers))
          .filter((line) => line.trim().length > 0)
          .join("\n"),
      )
      .filter((line) => line.trim().length > 0)
      .join("\n");
  }
  let text = "";
  let inSpoiler = false;
  for (const node of block.content ?? []) {
    // A run of spoiled words is one placeholder, however it is formatted.
    if (hideSpoilers && isSpoiler(node)) {
      if (!inSpoiler) text += SPOILER_PLACEHOLDER;
      inSpoiler = true;
      continue;
    }
    inSpoiler = false;
    text += node.type === "text" ? node.text : "\n";
  }
  return text;
};

/** The words without the formatting, one block per line. `hideSpoilers`
 *  is for quoting a message somewhere a reader has not chosen to open it. */
export const toPlainText = (
  doc: RichTextDoc,
  { hideSpoilers = false }: { hideSpoilers?: boolean } = {},
): string =>
  doc.content
    .map((block) => blockText(block, hideSpoilers))
    .filter((line) => line.trim().length > 0)
    .join("\n");

export const countImages = (doc: RichTextDoc): number => {
  let count = 0;
  for (const { block } of eachBlock(doc.content)) {
    if (block.type === "image") count += 1;
  }
  return count;
};

/** The pictures a document shows, lists included. Tolerates a body that is
 *  not a document, since it is also read back from rows written before any
 *  check. */
export const imageSources = (doc: unknown): string[] => {
  const found: string[] = [];
  const visit = (node: unknown) => {
    const { type, attrs, content } = (node ?? {}) as {
      type?: unknown;
      attrs?: { src?: unknown };
      content?: unknown;
    };
    if (type === "image" && typeof attrs?.src === "string") {
      found.push(attrs.src);
    }
    if (Array.isArray(content)) content.forEach(visit);
  };
  visit(doc);
  return found;
};

/** Nothing to read and nothing to look at. Tiptap's empty editor is one
 *  empty paragraph, not an empty document. */
export const isEmptyDoc = (doc: RichTextDoc): boolean =>
  countImages(doc) === 0 && toPlainText(doc).trim().length === 0;

/** The text of the first heading, which is how a patch-notes entry names
 *  its release. */
export const firstHeading = (doc: RichTextDoc): string | null => {
  const heading = doc.content.find((block) => block.type === "heading");
  const text = heading ? blockText(heading).trim() : "";
  return text || null;
};

export const RichTextDocSchema: z.ZodType<RichTextDoc, z.ZodTypeDef, unknown> =
  z
    .object({
      type: z.literal("doc"),
      content: z.array(BlockSchema).max(MAX_BLOCKS),
    })
    .superRefine((doc, ctx) => {
      let blocks = 0;
      let deepest = 0;
      for (const { depth } of eachBlock(doc.content)) {
        blocks += 1;
        deepest = Math.max(deepest, depth);
      }
      if (blocks > MAX_BLOCKS) {
        ctx.addIssue({ code: "custom", message: "That message is too long" });
      }
      if (deepest > MAX_LIST_DEPTH) {
        ctx.addIssue({
          code: "custom",
          message: `Lists can nest ${MAX_LIST_DEPTH} deep at most`,
        });
      }
      if (isEmptyDoc(doc)) {
        ctx.addIssue({ code: "custom", message: "A message cannot be empty" });
      }
      if (toPlainText(doc).length > RICH_TEXT_MAX_CHARS) {
        ctx.addIssue({
          code: "custom",
          message: `A message must be at most ${RICH_TEXT_MAX_CHARS} characters`,
        });
      }
      if (countImages(doc) > RICH_TEXT_MAX_IMAGES) {
        ctx.addIssue({
          code: "custom",
          message: `A message can hold at most ${RICH_TEXT_MAX_IMAGES} images`,
        });
      }
    });
