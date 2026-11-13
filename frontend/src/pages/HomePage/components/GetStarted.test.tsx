import { describe, expect, it, vi } from "vitest";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { closeSetupStep, useSetupSheet } from "../../../lib/setupSheet";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { buildProfile, buildProgress } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import GetStarted from "./GetStarted";

vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile({ username: "kai" }) }),
}));

const steps = (done: string[]) => {
    const fresh = buildProgress().setup;
    return {
        ...fresh,
        steps: Object.fromEntries(
            Object.keys(fresh.steps).map((key) => [key, done.includes(key)])
        ) as typeof fresh.steps,
    };
};

const respond = (done: string[]) =>
    server.use(
        http.post("http://localhost:3000/api/v1/me/progress", () =>
            HttpResponse.json(buildProgress({ setup: steps(done) }))
        )
    );

describe("GetStarted", () => {
    it("names the next step and opens it in place, with how far along it is", async () => {
        respond(["picture", "log"]);
        const sheet = renderHook(() => useSetupSheet());
        renderWithProviders(<GetStarted />);

        expect(
            await screen.findByRole("heading", { name: "Get started 2 of 8" })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Next: Write a bio" })
        );
        expect(sheet.result.current).toBe("bio");
        act(() => closeSetupStep());
    });

    it("opens any step not yet done from its tile, and leaves the done ones be", async () => {
        respond(["picture", "log"]);
        const sheet = renderHook(() => useSetupSheet());
        renderWithProviders(<GetStarted />);

        await userEvent.click(
            await screen.findByRole("button", { name: "Add a friend" })
        );
        expect(sheet.result.current).toBe("friend");
        expect(screen.getByText("Add a profile picture")).toBeInTheDocument();
        expect(screen.getAllByLabelText("Done")).toHaveLength(2);
        expect(
            screen.queryByRole("button", { name: "Add a profile picture" })
        ).toBeNull();
        act(() => closeSetupStep());
    });

    it("marks only the next step as next", async () => {
        respond(["picture", "log"]);
        renderWithProviders(<GetStarted />);
        await screen.findByRole("button", { name: "Next: Write a bio" });
        expect(screen.getAllByText("Next")).toHaveLength(1);
        expect(
            screen.getByRole("button", { name: "Rate a game" })
        ).toBeInTheDocument();
    });

    it("goes once every step is done", async () => {
        respond([
            "picture",
            "bio",
            "log",
            "rate",
            "review",
            "favourites",
            "friend",
            "post",
        ]);
        const { container, queryClient } = renderWithProviders(<GetStarted />);
        // Empty while loading too, so only once the answer is in.
        await waitFor(() =>
            expect(
                queryClient
                    .getQueryCache()
                    .find({ queryKey: ["progress", "me"] })?.state.status
            ).toBe("success")
        );
        expect(container).toBeEmptyDOMElement();
    });
});
