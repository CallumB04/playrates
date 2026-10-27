import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { DEFAULT_ABOUT_VISIBILITY } from "@playrates/shared";
import { buildProfile } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AboutCard from "./AboutCard";

const profile = buildProfile({
    bio: "Soulslikes, mostly.",
    about: {
        pronouns: "they/them",
        website: "https://www.example.com/me/",
        steam: "https://steamcommunity.com/id/gaben",
    },
});

describe("AboutCard", () => {
    it("shows a visitor the bio and only what is filled in", () => {
        renderWithProviders(<AboutCard profile={profile} />);

        expect(screen.getByText("Soulslikes, mostly.")).toBeInTheDocument();
        expect(screen.getByText("they/them")).toBeInTheDocument();
        expect(screen.queryByText("Location")).toBeNull();
        expect(screen.queryByText(/not set/)).toBeNull();
        expect(screen.queryByRole("button", { name: /Who sees/ })).toBeNull();
    });

    it("links out by a readable name, and vouches for nothing", () => {
        renderWithProviders(<AboutCard profile={profile} />);

        const site = screen.getByRole("link", { name: "example.com/me" });
        expect(site).toHaveAttribute("href", "https://www.example.com/me/");
        expect(site).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
        expect(screen.getByRole("link", { name: "gaben" })).toHaveAttribute(
            "target",
            "_blank"
        );
    });

    it("draws nothing for a visitor when there is nothing to say", () => {
        const { container } = renderWithProviders(
            <AboutCard profile={buildProfile({ bio: "", about: {} })} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("shows its owner every field, set or not, with who sees each", () => {
        renderWithProviders(
            <AboutCard
                profile={profile}
                owner={{
                    visibility: DEFAULT_ABOUT_VISIBILITY,
                    onChangeVisibility: vi.fn(),
                    onEdit: vi.fn(),
                    saving: false,
                }}
            />
        );

        expect(screen.getAllByText("Not set")).toHaveLength(3);
        expect(
            screen.getByRole("button", { name: "Who sees your name" })
        ).toHaveTextContent("Only me");
        expect(
            screen.getByRole("button", { name: "Who sees your pronouns" })
        ).toHaveTextContent("Everyone");
    });
});
