import type { AnnouncementTone } from "@playrates/shared";

/** The form's fields as the API takes them: trimmed, and no link rather than
 *  an empty one. Validation is the shared schema's job, not this. */
export const composeAnnouncement = (fields: {
    tone: AnnouncementTone;
    title: string;
    body: string;
    link: string;
}) => ({
    tone: fields.tone,
    title: fields.title.trim(),
    body: fields.body.trim(),
    link: fields.link.trim() === "" ? null : fields.link.trim(),
});
