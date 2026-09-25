import { z } from "zod";

/**
 * The rich text a community message is written in: Tiptap's document JSON,
 * narrowed to what the editor offers. Anything outside the allowlist is
 * refused rather than stripped, so a message is never stored as something
 * other than what its author saw. Unknown *attributes* on known nodes are
 * dropped, since Tiptap adds nullable ones (alt, title) of its own accord.
 */

export const RICH_TEXT_MAX_CHARS = 10_000;
export const RICH_TEXT_MAX_IMAGES = 6;
const MAX_BLOCKS = 300;

const MarkSchema = z.object({
  type: z.enum(["bold", "italic", "underline"]),
});

const TextNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(MarkSchema).max(3).optional(),
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

const BlockSchema = z.discriminatedUnion("type", [
  ParagraphSchema,
  HeadingSchema,
  ImageSchema,
]);

export type RichTextMark = z.infer<typeof MarkSchema>;
export type RichTextInline = z.infer<typeof InlineSchema>;
export type RichTextBlock = z.infer<typeof BlockSchema>;

export interface RichTextDoc {
  type: "doc";
  content: RichTextBlock[];
}

const blockText = (block: RichTextBlock): string =>
  block.type === "image"
    ? ""
    : (block.content ?? [])
        .map((node) => (node.type === "text" ? node.text : "\n"))
        .join("");

/** The words without the formatting, one block per line. */
export const toPlainText = (doc: RichTextDoc): string =>
  doc.content
    .map(blockText)
    .filter((line) => line.trim().length > 0)
    .join("\n");

export const countImages = (doc: RichTextDoc): number =>
  doc.content.filter((block) => block.type === "image").length;

/** The pictures a document shows. Tolerates a body that is not a document,
 *  since it is also read back from rows written before any check. */
export const imageSources = (doc: unknown): string[] => {
  const content = (doc as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) return [];
  return content.flatMap((block) => {
    const src = (block as { type?: unknown; attrs?: { src?: unknown } })
      ?.attrs?.src;
    return (block as { type?: unknown })?.type === "image" &&
      typeof src === "string"
      ? [src]
      : [];
  });
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
