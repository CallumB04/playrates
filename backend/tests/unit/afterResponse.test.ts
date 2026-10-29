import { describe, expect, it, vi } from "vitest";
import { afterResponse } from "../../src/lib/afterResponse.js";

describe("afterResponse", () => {
  it("runs the work outside Vercel too", async () => {
    let ran = false;
    afterResponse(
      (async () => {
        ran = true;
      })(),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(ran).toBe(true);
  });

  it("hands a failure to the caller rather than rejecting", async () => {
    const onError = vi.fn();
    afterResponse(Promise.reject(new Error("smtp down")), onError);
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "smtp down" }));
  });

  it("swallows a failure when nobody is listening", async () => {
    expect(() => afterResponse(Promise.reject(new Error("x")))).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});
