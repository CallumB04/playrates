import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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
    it("leads to the first step not yet done, with how far along it is", async () => {
        respond(["picture", "log"]);
        renderWithProviders(<GetStarted />);

        const row = await screen.findByRole("link", { name: /Get started/ });
        expect(row).toHaveAttribute("href", "/user/kai?edit=profile");
        expect(row).toHaveTextContent("Write a bio");
        expect(row).toHaveTextContent("2/8 steps done. Next:");
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
