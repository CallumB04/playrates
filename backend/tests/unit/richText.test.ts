import { describe, expect, it } from "vitest";
import {
  RICH_TEXT_MAX_CHARS,
  RichTextDocSchema,
  countImages,
  imageSources,
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

  it("covers spoilers when asked, one placeholder per run", () => {
    const spoiled: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "It turns out " },
            { type: "text", text: "the king", marks: [{ type: "spoiler" }] },
            {
              type: "text",
              text: " was the ghost",
              marks: [{ type: "spoiler" }, { type: "bold" }],
            },
            { type: "text", text: " all along." },
          ],
        },
      ],
    };

    expect(toPlainText(spoiled)).toBe(
      "It turns out the king was the ghost all along.",
    );
    expect(toPlainText(spoiled, { hideSpoilers: true })).toBe(
      "It turns out [spoiler] all along.",
    );
    expect(RichTextDocSchema.safeParse(spoiled).success).toBe(true);
  });

  describe("lists", () => {
    const item = (text: string, ...more: object[]) => ({
      type: "listItem",
      content: [
        { type: "paragraph", content: [{ type: "text", text }] },
        ...more,
      ],
    });
    const listDoc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            item("Faster search", {
              type: "orderedList",
              attrs: { start: 1 },
              content: [item("titles"), item("messages")],
            }),
            {
              type: "listItem",
              content: [
                { type: "image", attrs: { src: "https://cdn.example/a.webp" } },
              ],
            },
          ],
        },
      ],
    };

    it("takes bulleted and numbered lists, nested, with pictures in them", () => {
      expect(RichTextDocSchema.safeParse(listDoc).success).toBe(true);
    });

    it("reads a list a line per item, pictures included in the count", () => {
      const parsed = RichTextDocSchema.parse(listDoc);

      expect(toPlainText(parsed)).toBe("Faster search\ntitles\nmessages");
      expect(countImages(parsed)).toBe(1);
      expect(imageSources(parsed)).toEqual(["https://cdn.example/a.webp"]);
    });

    it("refuses a list item that is not a list item, or an empty list", () => {
      const badItem = {
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [{ type: "paragraph", content: [text("x")] }],
          },
        ],
      };
      const empty = {
        type: "doc",
        content: [{ type: "bulletList", content: [] }],
      };

      expect(RichTextDocSchema.safeParse(badItem).success).toBe(false);
      expect(RichTextDocSchema.safeParse(empty).success).toBe(false);
    });

    it("stops lists nesting past four deep", () => {
      const nest = (depth: number): object =>
        depth === 0
          ? { type: "paragraph", content: [text("deep")] }
          : {
              type: "bulletList",
              content: [{ type: "listItem", content: [nest(depth - 1)] }],
            };

      expect(
        RichTextDocSchema.safeParse({ type: "doc", content: [nest(4)] })
          .success,
      ).toBe(true);
      expect(
        RichTextDocSchema.safeParse({ type: "doc", content: [nest(6)] })
          .success,
      ).toBe(false);
    });
  });
});
