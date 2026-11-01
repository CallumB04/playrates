import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    install,
    isInstalled,
    useInstallOffer,
    watchInstallOffer,
} from "./installPrompt";

const offer = (outcome: "accepted" | "dismissed") =>
    Object.assign(new Event("beforeinstallprompt"), {
        prompt: vi.fn(async () => {}),
        userChoice: Promise.resolve({ outcome }),
    });

describe("the install offer", () => {
    watchInstallOffer();

    it("is held when the browser makes it, and spent when used", async () => {
        const { result } = renderHook(() => useInstallOffer());
        expect(result.current).toBe(false);
        expect(await install()).toBe(false);

        const event = offer("accepted");
        act(() => void window.dispatchEvent(event));
        expect(result.current).toBe(true);

        let answer = false;
        await act(async () => {
            answer = await install();
        });
        expect(event.prompt).toHaveBeenCalledOnce();
        expect(answer).toBe(true);
        expect(result.current).toBe(false);
    });

    it("says no when they dismiss it, and goes once installed", async () => {
        const { result } = renderHook(() => useInstallOffer());
        act(() => void window.dispatchEvent(offer("dismissed")));
        let answer = true;
        await act(async () => {
            answer = await install();
        });
        expect(answer).toBe(false);

        act(() => void window.dispatchEvent(offer("accepted")));
        act(() => void window.dispatchEvent(new Event("appinstalled")));
        expect(result.current).toBe(false);
    });

    it("knows when it's running as the installed app", () => {
        const matchMedia = vi
            .spyOn(window, "matchMedia")
            .mockReturnValue({ matches: true } as MediaQueryList);
        expect(isInstalled()).toBe(true);
        matchMedia.mockReturnValue({ matches: false } as MediaQueryList);
        expect(isInstalled()).toBe(false);
        matchMedia.mockRestore();
    });
});
