import { describe, expect, it } from "vitest";
import {
  groupPatchNote,
  paragraphsOf,
  patchNoteDoc,
  PatchNoteSchema,
  toPlainText,
} from "@playrates/shared";

const note = {
  title: "v1.2",
  intro: "First line.\n\nSecond line.",
  items: [
    { kind: "fix" as const, text: "Fixed a thing", link: null },
    { kind: "feature" as const, text: "Added Steam import", link: "/settings" },
    { kind: "feature" as const, text: "Added lists", link: null },
  ],
  outro: null,
};

describe("PatchNoteSchema", () => {
  it("takes a release with only a message", () => {
    const parsed = PatchNoteSchema.parse({
      title: " v1 ",
      intro: "Hello",
      items: [],
      outro: "  ",
    });
    expect(parsed).toEqual({
      title: "v1",
      intro: "Hello",
      items: [],
      outro: null,
    });
  });

  it("turns away a release with nothing in it", () => {
    expect(
      PatchNoteSchema.safeParse({
        title: "v1",
        intro: "",
        items: [],
        outro: null,
      }).success,
    ).toBe(false);
  });

  it("links to a page here or over https, and nowhere else", () => {
    const withLink = (link: string) =>
      PatchNoteSchema.safeParse({
        ...note,
        items: [{ kind: "feature", text: "x", link }],
      }).success;
    expect(withLink("/settings")).toBe(true);
    expect(withLink("https://store.steampowered.com")).toBe(true);
    expect(withLink("http://example.com")).toBe(false);
    expect(withLink("javascript:alert(1)")).toBe(false);
    expect(withLink("//evil.example")).toBe(false);
  });
});

describe("groupPatchNote", () => {
  it("groups by kind in kind order, keeping each kind's order", () => {
    expect(
      groupPatchNote(note.items).map((g) => [
        g.kind,
        g.items.map((i) => i.text),
      ]),
    ).toEqual([
      ["feature", ["Added Steam import", "Added lists"]],
      ["fix", ["Fixed a thing"]],
    ]);
  });
});

describe("paragraphsOf", () => {
  it("splits on blank lines and drops empty ones", () => {
    expect(paragraphsOf("a\nb\n\n  \n\nc")).toEqual(["a\nb", "c"]);
    expect(paragraphsOf(null)).toEqual([]);
  });
});

describe("patchNoteDoc", () => {
  it("reads as the release in plain text: title, messages, kinds, changes", () => {
    const text = toPlainText(patchNoteDoc({ ...note, outro: "Bye" }));
    for (const part of [
      "v1.2",
      "First line.",
      "Second line.",
      "New features",
      "Added Steam import",
      "Fixes",
      "Fixed a thing",
      "Bye",
    ]) {
      expect(text).toContain(part);
    }
    expect(text.indexOf("New features")).toBeLessThan(text.indexOf("Fixes"));
    expect(text).not.toContain("Improvements");
  });

  it("opens with the title as an H1, which the entry is named after", () => {
    expect(patchNoteDoc(note).content[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
    });
  });
});
