import { Mark, mergeAttributes } from "@tiptap/react";

/**
 * Text the reader has to ask to see. Stored as a mark like bold, so any run
 * of words can be one, and read back as `span[data-spoiler]` so a spoiler
 * pasted from another PlayRates message stays one.
 */
export const Spoiler = Mark.create({
    name: "spoiler",

    parseHTML() {
        return [{ tag: "span[data-spoiler]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(HTMLAttributes, { "data-spoiler": "" }),
            0,
        ];
    },

    addKeyboardShortcuts() {
        return {
            "Mod-Shift-x": () => this.editor.commands.toggleMark(this.name),
        };
    },
});
