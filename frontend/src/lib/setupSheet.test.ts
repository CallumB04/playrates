import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { closeSetupStep, openSetupStep, useSetupSheet } from "./setupSheet";

describe("setupSheet", () => {
    it("opens one step's sheet at a time, from anywhere, and closes it", () => {
        const { result } = renderHook(() => useSetupSheet());
        expect(result.current).toBeNull();

        act(() => openSetupStep("review"));
        expect(result.current).toBe("review");
        act(() => openSetupStep("friend"));
        expect(result.current).toBe("friend");

        act(() => closeSetupStep());
        expect(result.current).toBeNull();
    });
});
