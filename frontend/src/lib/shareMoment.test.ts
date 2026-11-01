import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { closeShareMoment, shareMoment, useShareMoment } from "./shareMoment";

describe("shareMoment", () => {
    it("opens from anywhere, the latest replacing the last, and closes", () => {
        const { result } = renderHook(() => useShareMoment());
        expect(result.current).toBeNull();

        act(() =>
            shareMoment({ title: "Level 2", path: "/user/ana", text: "a" })
        );
        act(() => shareMoment({ title: "Hades", path: "/game/1", text: "b" }));
        expect(result.current).toEqual({
            title: "Hades",
            path: "/game/1",
            text: "b",
        });

        act(() => closeShareMoment());
        expect(result.current).toBeNull();
    });
});
