import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn(() => Promise.resolve());
vi.mock("../api/endpoints/reports", () => ({ sendClientError: send }));

/* The reporter keeps per-page-load state, so each test loads it fresh. */
const load = async () => {
    vi.resetModules();
    return import("./errorReporting");
};

beforeEach(() => send.mockClear());

describe("isReportable", () => {
    it("takes an ordinary error", async () => {
        const { isReportable } = await load();
        expect(isReportable("TypeError: x is undefined", "at GamePage")).toBe(
            true
        );
    });

    it.each([
        ["Script error."],
        ["ResizeObserver loop completed with undelivered notifications."],
        [
            "TypeError: Failed to fetch dynamically imported module: /assets/a.js",
        ],
        ["TypeError: Importing a module script failed."],
        ["   "],
    ])("leaves out %j", async (message) => {
        const { isReportable } = await load();
        expect(isReportable(message)).toBe(false);
    });

    it("leaves out an extension's errors", async () => {
        const { isReportable } = await load();
        expect(
            isReportable(
                "Error: boom",
                "at chrome-extension://abc/content.js:1"
            )
        ).toBe(false);
    });
});

describe("reportError", () => {
    it("sends nothing until installed", async () => {
        const { reportError } = await load();
        reportError(new Error("boom"));
        expect(send).not.toHaveBeenCalled();
    });

    it("sends the error with the page's path and the build", async () => {
        const { installErrorReporting, reportError } = await load();
        installErrorReporting();
        window.history.pushState({}, "", "/game/12?ref=abc");

        reportError(new TypeError("x is undefined"));

        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "TypeError: x is undefined",
                path: "/game/12",
                stack: expect.stringContaining("TypeError"),
            })
        );
    });

    it("sends the same error once, and five at most", async () => {
        const { installErrorReporting, reportError } = await load();
        installErrorReporting();

        reportError(new Error("same"));
        reportError(new Error("same"));
        for (let i = 0; i < 10; i += 1) reportError(new Error(`error ${i}`));

        expect(send).toHaveBeenCalledTimes(5);
    });

    it("never throws when the report fails", async () => {
        send.mockImplementationOnce(() => Promise.reject(new Error("offline")));
        const { installErrorReporting, reportError } = await load();
        installErrorReporting();

        expect(() => reportError("a string rejection")).not.toThrow();
        await Promise.resolve();
    });
});
