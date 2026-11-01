import {
    isAnnouncementHref,
    type PatchNote,
    type PatchNoteKind,
} from "@playrates/shared";

export interface Row {
    /** For React, not the API: rows move and go. */
    key: number;
    kind: PatchNoteKind;
    text: string;
    link: string;
}

let nextKey = 1;
export const row = (
    kind: PatchNoteKind = "feature",
    text = "",
    link = ""
): Row => ({
    key: nextKey++,
    kind,
    text,
    link,
});

/** The note from the form, leaving out rows with nothing written in them. */
export const noteFrom = (draft: {
    title: string;
    intro: string;
    rows: Row[];
    outro: string;
}): PatchNote => ({
    title: draft.title.trim(),
    intro: draft.intro.trim() || null,
    items: draft.rows
        .filter((r) => r.text.trim())
        .map((r) => ({
            kind: r.kind,
            text: r.text.trim(),
            link: r.link.trim() || null,
        })),
    outro: draft.outro.trim() || null,
});

/** What would stop it saving, or null. */
export const problemWith = (note: PatchNote, rows: Row[]): string | null => {
    if (!note.title) return "Give the release a title.";
    if (rows.some((r) => r.link.trim() && !isAnnouncementHref(r.link.trim()))) {
        return "A link is a page here, starting with /, or an https:// address.";
    }
    if (note.items.length === 0 && !note.intro && !note.outro) {
        return "Add a change or a message.";
    }
    return null;
};
