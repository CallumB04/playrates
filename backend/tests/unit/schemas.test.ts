import { describe, expect, it } from "vitest";
import {
  BooleanQuerySchema,
  GameLogInputSchema,
  GameQuerySchema,
  PaginationSchema,
  ReviewInputSchema,
  UpdateProfileSchema,
  UsernameSchema,
} from "@playrates/shared";
import { toRange } from "../../src/lib/pagination.js";

describe("boolean query parameters", () => {
  /**
   * z.coerce.boolean() runs Boolean(value), so every non-empty string is
   * true — meaning "?includeAdult=false" would have parsed as true. This is
   * the regression test for that.
   */
  it('parses the string "false" as false', () => {
    expect(BooleanQuerySchema.parse("false")).toBe(false);
    expect(BooleanQuerySchema.parse("0")).toBe(false);
  });

  it('parses the string "true" as true', () => {
    expect(BooleanQuerySchema.parse("true")).toBe(true);
    expect(BooleanQuerySchema.parse("1")).toBe(true);
  });

  it("rejects anything else rather than guessing", () => {
    expect(() => BooleanQuerySchema.parse("yes")).toThrow();
  });

  it("applies through the games query schema", () => {
    const parsed = GameQuerySchema.parse({ excludeLogged: "true" });
    expect(parsed.excludeLogged).toBe(true);
  });
});

describe("pagination", () => {
  it("defaults to the first page", () => {
    expect(PaginationSchema.parse({})).toEqual({ page: 1, limit: 25 });
  });

  it("caps the page size so a caller cannot request the whole table", () => {
    expect(() => PaginationSchema.parse({ limit: 500 })).toThrow();
  });

  it("converts a page and limit into an inclusive range", () => {
    expect(toRange({ page: 1, limit: 25 })).toEqual({ from: 0, to: 24 });
    expect(toRange({ page: 3, limit: 10 })).toEqual({ from: 20, to: 29 });
  });
});

describe("game log input", () => {
  it("accepts a rating on the 0.5 step", () => {
    for (const rating of [0.5, 6.5, 8.5, 10]) {
      expect(() =>
        GameLogInputSchema.parse({ status: "played", rating }),
      ).not.toThrow();
    }
  });

  /* Zero is the absence of a rating, not the bottom of the scale, and null
     already says that. */
  it("rejects a zero, and takes a null for not rated", () => {
    expect(() =>
      GameLogInputSchema.parse({ status: "played", rating: 0 }),
    ).toThrow();
    expect(() =>
      GameLogInputSchema.parse({ status: "played", rating: null }),
    ).not.toThrow();
  });

  /* Quarter points were the old scale. They are now off-step, which is what
     the migration rounded the existing logs onto. */
  it("rejects a rating off the step", () => {
    for (const rating of [6.3, 6.25, 8.75]) {
      expect(() =>
        GameLogInputSchema.parse({ status: "played", rating }),
      ).toThrow();
    }
  });

  it("rejects a rating outside 0.5-10", () => {
    for (const rating of [11, -0.5]) {
      expect(() =>
        GameLogInputSchema.parse({ status: "played", rating }),
      ).toThrow();
    }
  });

  it("rejects an unknown status", () => {
    expect(() => GameLogInputSchema.parse({ status: "abandoned" })).toThrow();
  });

  it("rejects unknown keys rather than ignoring them", () => {
    expect(() =>
      GameLogInputSchema.parse({ status: "played", userId: "someone-else" }),
    ).toThrow();
  });

  it("rejects a malformed date", () => {
    expect(() =>
      GameLogInputSchema.parse({
        status: "played",
        startDate: "10/05/2024",
      }),
    ).toThrow();
  });
});

describe("profile input", () => {
  it("accepts a valid username", () => {
    expect(() => UsernameSchema.parse("Callum_04")).not.toThrow();
  });

  it("rejects usernames with spaces or symbols", () => {
    expect(() => UsernameSchema.parse("call um")).toThrow();
    expect(() => UsernameSchema.parse("callum!")).toThrow();
  });

  it("rejects usernames outside the length bounds", () => {
    expect(() => UsernameSchema.parse("ab")).toThrow();
    expect(() => UsernameSchema.parse("a".repeat(25))).toThrow();
  });

  /** The mass-assignment guard. */
  it("rejects fields that are not user-editable", () => {
    expect(() => UpdateProfileSchema.parse({ id: "x" })).toThrow();
    expect(() => UpdateProfileSchema.parse({ password: "x" })).toThrow();
    expect(() => UpdateProfileSchema.parse({ email: "x@y.test" })).toThrow();
  });

  /* A picture is uploaded to, and cleared through, /profiles/me/avatar. If
     avatarUrl were editable here, anyone could wear any URL on the web. */
  it("will not take a picture URL", () => {
    expect(() =>
      UpdateProfileSchema.parse({ avatarUrl: "https://example.com/a.png" }),
    ).toThrow();
    expect(() => UpdateProfileSchema.parse({ avatarUrl: null })).toThrow();
  });
});

describe("review input", () => {
  it("defaults to public", () => {
    expect(ReviewInputSchema.parse({ body: "good" }).isPublic).toBe(true);
  });

  it("trims and rejects a whitespace-only body", () => {
    expect(() => ReviewInputSchema.parse({ body: "   " })).toThrow();
  });
});
