import { z } from "zod";
import { isAnnouncementHref } from "../announcementBody.js";
import type { RichTextDoc } from "./richText.js";

/** What a change is, picked when writing it. In the order a release lists
 *  them: what's new first, what went last before the odds and ends. */
export const PATCH_NOTE_KINDS = [
  "feature",
  "improvement",
  "fix",
  "removed",
  "other",
] as const;
export type PatchNoteKind = (typeof PATCH_NOTE_KINDS)[number];

/** Each kind's name, in the picker and beside a change in an email. */
export const PATCH_NOTE_KIND_NAMES: Record<PatchNoteKind, string> = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
  removed: "Removed",
  other: "Other",
};

/** Each kind as the heading over its changes on the page. */
export const PATCH_NOTE_GROUP_NAMES: Record<PatchNoteKind, string> = {
  feature: "New",
  improvement: "Improved",
  fix: "Fixed",
  removed: "Removed",
  other: "Other",
};

/** A release's changes by kind, in PATCH_NOTE_KINDS order, each kind's in
 *  the order written. Kinds with nothing in them are left out. */
export const groupedItems = <T extends { kind: PatchNoteKind }>(
  items: T[],
): { kind: PatchNoteKind; items: T[] }[] =>
  PATCH_NOTE_KINDS.map((kind) => ({
    kind,
    items: items.filter((item) => item.kind === kind),
  })).filter((group) => group.items.length > 0);

/** The same changes as one list, in that order. */
export const sortedItems = <T extends { kind: PatchNoteKind }>(
  items: T[],
): T[] => groupedItems(items).flatMap((group) => group.items);

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
 *  optional, and the changes themselves, as written; shown by kind. */
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
      ...(note.items.length > 0
        ? [
            {
              type: "bulletList",
              content: sortedItems(note.items).map((item) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: `${PATCH_NOTE_KIND_NAMES[item.kind]}: `,
                        marks: [{ type: "bold" }],
                      },
                      { type: "text", text: item.text },
                    ],
                  },
                ],
              })),
            },
          ]
        : []),
      ...paragraphsOf(note.outro).map(paragraph),
    ],
  }) as RichTextDoc;
