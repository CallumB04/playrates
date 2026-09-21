import { describe, expect, it } from "vitest";
import { assertOwner, canViewReview } from "../../src/lib/authz.js";
import { AppError } from "../../src/lib/AppError.js";

const ALICE = "a1b2c3d4-1111-1111-1111-111111111111";
const BOB = "b2c3d4e5-2222-2222-2222-222222222222";

describe("assertOwner", () => {
  it("passes when the caller owns the resource", () => {
    expect(() => assertOwner(ALICE, ALICE)).not.toThrow();
  });

  it("throws a 403 when it belongs to someone else", () => {
    expect(() => assertOwner(ALICE, BOB)).toThrow(AppError);
    try {
      assertOwner(ALICE, BOB);
    } catch (error) {
      expect((error as AppError).status).toBe(403);
      expect((error as AppError).code).toBe("forbidden");
    }
  });

  it("compares exactly, so a differently-cased id is not the owner", () => {
    expect(() => assertOwner(ALICE.toUpperCase(), ALICE)).toThrow(AppError);
  });
});

describe("canViewReview", () => {
  const review = (isPublic: boolean) => ({ isPublic, authorId: ALICE });

  it("shows a public review to anyone, signed in or not", () => {
    expect(canViewReview(BOB, review(true))).toBe(true);
    expect(canViewReview(undefined, review(true))).toBe(true);
  });

  it("shows a private review to its author", () => {
    expect(canViewReview(ALICE, review(false))).toBe(true);
  });

  it("hides a private review from everybody else", () => {
    expect(canViewReview(BOB, review(false))).toBe(false);
    expect(canViewReview(undefined, review(false))).toBe(false);
  });
});
