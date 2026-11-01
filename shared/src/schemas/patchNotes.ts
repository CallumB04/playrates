import { z } from "zod";
import { isAnnouncementHref } from "../announcementBody.js";
import type { RichTextDoc } from "./richText.js";

/** What a change is, in the order a release lists them. */
export const PATCH_NOTE_KINDS = [
  "feature",
  "improvement",
  "fix",
  "other",
] as const;
export type PatchNoteKind = (typeof PATCH_NOTE_KINDS)[number];

/** The heading each kind is listed under. */
export const PATCH_NOTE_KIND_LABELS: Record<PatchNoteKind, string> = {
  feature: "New features",
  improvement: "Improvements",
  fix: "Fixes",
  other: "Other",
};

/** One kind's name for a single change, for the picker. */
export const PATCH_NOTE_KIND_NAMES: Record<PatchNoteKind, string> = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
  other: "Other",
};

/** A page on the site ("/settings") or anywhere else over https. */
const LinkSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isAnnouncementHref, "A page here, starting /, or an https:// address")
  .nullable();

const ProseSchema = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .transform((s) => s || null);

export const PatchNoteItemSchema = z.object({
  kind: z.enum(PATCH_NOTE_KINDS),
  text: z.string().trim().min(1).max(500),
  link: LinkSchema.transform((s) => s || null),
});
export type PatchNoteItem = z.infer<typeof PatchNoteItemSchema>;

/** A release: its title, a message above the changes and one below, both
 *  optional, and the changes themselves. */
export const PatchNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    intro: ProseSchema,
    items: z.array(PatchNoteItemSchema).max(80),
    outro: ProseSchema,
  })
  .refine(
    (note) => note.items.length > 0 || note.intro || note.outro,
    "A release needs a change or a message",
  );
export type PatchNote = z.infer<typeof PatchNoteSchema>;
export type PatchNoteInput = z.input<typeof PatchNoteSchema>;

/** The changes by kind, in kind order, each kind's in the order written.
 *  Kinds with none are left out. */
export const groupPatchNote = (
  items: PatchNoteItem[],
): { kind: PatchNoteKind; items: PatchNoteItem[] }[] =>
  PATCH_NOTE_KINDS.map((kind) => ({
    kind,
    items: items.filter((item) => item.kind === kind),
  })).filter((group) => group.items.length > 0);

/** A message's paragraphs: a blank line between them. */
export const paragraphsOf = (text: string | null): string[] =>
  (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const paragraph = (text: string) => ({
  type: "paragraph" as const,
  content: [{ type: "text" as const, text }],
});

/**
 * The release as the community's rich text, for everything that reads a
 * message's body: emails, search, link previews, the title. Links don't
 * survive it (rich text has none); the page draws from the note itself.
 */
export const patchNoteDoc = (note: PatchNote): RichTextDoc =>
  ({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: note.title }],
      },
      ...paragraphsOf(note.intro).map(paragraph),
      ...groupPatchNote(note.items).flatMap((group) => [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: PATCH_NOTE_KIND_LABELS[group.kind] }],
        },
        {
          type: "bulletList",
          content: group.items.map((item) => ({
            type: "listItem",
            content: [paragraph(item.text)],
          })),
        },
      ]),
      ...paragraphsOf(note.outro).map(paragraph),
    ],
  }) as RichTextDoc;
