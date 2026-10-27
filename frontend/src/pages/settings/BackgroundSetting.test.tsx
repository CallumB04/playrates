import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import BackgroundSetting from "./BackgroundSetting";

const API = "http://localhost:3000/api/v1";

describe("BackgroundSetting", () => {
    it("shows the background where its owner cropped it, and removes it", async () => {
        let removed = false;
        server.use(
            http.delete(`${API}/profiles/me/background`, () => {
                removed = true;
                return HttpResponse.json(buildProfile());
            })
        );
        renderWithProviders(
            <BackgroundSetting
                profile={buildProfile({
                    background: {
                        url: "https://img/shot.jpg",
                        gameId: 1,
                        position: 70,
                    },
                })}
            />
        );

        expect(
            screen.getByRole("img", { name: "Your profile background" })
        ).toHaveStyle({ objectPosition: "center 70%" });

        await userEvent.click(screen.getByRole("button", { name: "Remove" }));
        await waitFor(() => expect(removed).toBe(true));
    });

    it("offers to choose one when there's none", () => {
        renderWithProviders(<BackgroundSetting profile={buildProfile()} />);

        expect(screen.getByText("No background")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Choose a background" })
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    });
});
