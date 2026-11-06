import { describe, expect, it } from "vitest";
import {
  groupedItems,
  paragraphsOf,
  patchNoteDoc,
  PatchNoteSchema,
  sortedItems,
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

describe("paragraphsOf", () => {
  it("splits on blank lines and drops empty ones", () => {
    expect(paragraphsOf("a\nb\n\n  \n\nc")).toEqual(["a\nb", "c"]);
    expect(paragraphsOf(null)).toEqual([]);
  });
});

describe("patchNoteDoc", () => {
  it("reads as the release in plain text: title, messages, then the changes by kind", () => {
    const text = toPlainText(patchNoteDoc({ ...note, outro: "Bye" }));
    for (const part of [
      "v1.2",
      "First line.",
      "Second line.",
      "Fix: Fixed a thing",
      "Feature: Added Steam import",
      "Bye",
    ]) {
      expect(text).toContain(part);
    }
    expect(text.indexOf("Added Steam import")).toBeLessThan(
      text.indexOf("Fixed a thing"),
    );
  });

  it("opens with the title as an H1, which the entry is named after", () => {
    expect(patchNoteDoc(note).content[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
    });
  });
});

describe("a release's changes by kind", () => {
  const items = [
    { kind: "other" as const, text: "Tidied up" },
    { kind: "fix" as const, text: "Fixed one" },
    { kind: "removed" as const, text: "Took one away" },
    { kind: "feature" as const, text: "Added one" },
    { kind: "fix" as const, text: "Fixed another" },
    { kind: "improvement" as const, text: "Made one better" },
  ];

  it("puts what's new first, then improved, fixed, removed and the rest", () => {
    expect(groupedItems(items).map((g) => g.kind)).toEqual([
      "feature",
      "improvement",
      "fix",
      "removed",
      "other",
    ]);
  });

  it("keeps each kind's changes in the order they were written", () => {
    expect(sortedItems(items).map((i) => i.text)).toEqual([
      "Added one",
      "Made one better",
      "Fixed one",
      "Fixed another",
      "Took one away",
      "Tidied up",
    ]);
  });

  it("leaves out a kind with nothing in it", () => {
    expect(groupedItems([items[1]!])).toEqual([
      { kind: "fix", items: [items[1]] },
    ]);
  });
});
