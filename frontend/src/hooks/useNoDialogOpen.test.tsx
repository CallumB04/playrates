import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useNoDialogOpen } from "./useNoDialogOpen";

const openDialog = () => {
    const el = document.createElement("div");
    el.setAttribute("aria-modal", "true");
    document.body.append(el);
    return el;
};

describe("useNoDialogOpen", () => {
    it("is clear at once with nothing open", () => {
        const { result } = renderHook(() => useNoDialogOpen(true));
        expect(result.current).toBe(true);
    });

    it("waits for another popup to close", async () => {
        const other = openDialog();
        const { result } = renderHook(() => useNoDialogOpen(true));
        expect(result.current).toBe(false);
        act(() => other.remove());
        await waitFor(() => expect(result.current).toBe(true));
    });

    // Its own popup opening mustn't send it back to waiting.
    it("stays clear once it is, until it waits again", async () => {
        const { result, rerender } = renderHook(
            ({ waiting }) => useNoDialogOpen(waiting),
            { initialProps: { waiting: true } }
        );
        const own = openDialog();
        await new Promise((r) => setTimeout(r, 0));
        expect(result.current).toBe(true);
        rerender({ waiting: false });
        expect(result.current).toBe(false);
        own.remove();
    });

    it("isn't clear while not waiting", () => {
        const { result } = renderHook(() => useNoDialogOpen(false));
        expect(result.current).toBe(false);
    });
});
