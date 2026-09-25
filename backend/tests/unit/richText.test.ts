import { describe, expect, it } from "vitest";
import {
  RICH_TEXT_MAX_CHARS,
  RichTextDocSchema,
  firstHeading,
  isEmptyDoc,
  toPlainText,
  type RichTextDoc,
} from "@playrates/shared";

const text = (value: string, marks?: { type: string }[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});

const image = (src = "https://cdn.example/a.webp") => ({
  type: "image",
  attrs: { src, alt: null, title: null },
});

describe("RichTextDocSchema", () => {
  it("accepts every node and mark the editor offers", () => {
    const result = RichTextDocSchema.safeParse({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [text("Title")] },
        { type: "heading", attrs: { level: 3 }, content: [text("Sub")] },
        {
          type: "paragraph",
          content: [
            text("bold", [{ type: "bold" }]),
            { type: "hardBreak" },
            text("both", [{ type: "italic" }, { type: "underline" }]),
          ],
        },
        image(),
      ],
    });

    expect(result.success).toBe(true);
  });

  it("drops attributes it does not know rather than storing them", () => {
    const parsed = RichTextDocSchema.parse({
      type: "doc",
      content: [image()],
    });

    expect(parsed.content[0]).toEqual({
      type: "image",
      attrs: { src: "https://cdn.example/a.webp", alt: null },
    });
  });

  it.each([
    ["an unknown node", { type: "codeBlock", content: [text("x")] }],
    [
      "an unknown mark",
      { type: "paragraph", content: [text("x", [{ type: "link" }])] },
    ],
    ["an h4", { type: "heading", attrs: { level: 4 }, content: [text("x")] }],
    ["an http image", image("http://cdn.example/a.webp")],
    ["a javascript: image", image("javascript:alert(1)")],
  ])("refuses %s", (_label, block) => {
    expect(
      RichTextDocSchema.safeParse({ type: "doc", content: [text("ok"), block] })
        .success,
    ).toBe(false);
  });

  it("refuses a document with nothing in it", () => {
    expect(
      RichTextDocSchema.safeParse({
        type: "doc",
        content: [{ type: "paragraph", content: [text("   ")] }],
      }).success,
    ).toBe(false);
  });

  it("takes a document that is only a picture", () => {
    expect(
      RichTextDocSchema.safeParse({ type: "doc", content: [image()] }).success,
    ).toBe(true);
  });

  it("refuses text past the limit and too many pictures", () => {
    const long = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [text("x".repeat(RICH_TEXT_MAX_CHARS + 1))],
        },
      ],
    };
    const pictures = {
      type: "doc",
      content: Array.from({ length: 7 }, () => image()),
    };

    expect(RichTextDocSchema.safeParse(long).success).toBe(false);
    expect(RichTextDocSchema.safeParse(pictures).success).toBe(false);
  });
});

describe("rich text helpers", () => {
  const doc: RichTextDoc = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "v1.1" }],
      },
      { type: "paragraph" },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Line one" },
          { type: "hardBreak" },
          { type: "text", text: "line two" },
        ],
      },
      { type: "image", attrs: { src: "https://cdn.example/a.webp" } },
    ],
  };

  it("flattens to text a block per line, skipping empty ones", () => {
    expect(toPlainText(doc)).toBe("v1.1\nLine one\nline two");
  });

  it("names a document by its first heading", () => {
    expect(firstHeading(doc)).toBe("v1.1");
    expect(
      firstHeading({ type: "doc", content: [{ type: "paragraph" }] }),
    ).toBeNull();
  });

  it("counts Tiptap's empty editor as empty", () => {
    expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(
      true,
    );
    expect(isEmptyDoc(doc)).toBe(false);
  });
});
