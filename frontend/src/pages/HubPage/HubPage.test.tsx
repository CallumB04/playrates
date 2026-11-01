import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import HubPage from "./HubPage";

const at = (path: string) =>
    renderWithProviders(
        <Routes>
            <Route path="/games/best/:year" element={<HubPage kind="year" />} />
        </Routes>,
        { route: path }
    );

describe("HubPage", () => {
    it("heads a year's best with its words, and steps to the years beside", async () => {
        at("/games/best/2019");

        expect(
            await screen.findByRole("heading", {
                name: "The best games of 2019",
            })
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "← 2018" })).toHaveAttribute(
            "href",
            "/games/best/2018"
        );
    });

    it("is the not-found page for a year it doesn't have", async () => {
        at("/games/best/1900");

        expect(
            await screen.findByRole("heading", { level: 1 })
        ).not.toHaveTextContent("1900");
    });
});
