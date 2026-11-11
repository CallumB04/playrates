import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildProfile } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AboutCard from "./AboutCard";

const profile = buildProfile({
    bio: "Soulslikes, mostly.",
    online: false,
    about: {
        pronouns: "they/them",
        website: "https://www.example.com/me/",
        discord: "devuser",
        steam: "https://steamcommunity.com/id/gaben",
    },
    facts: { age: 35, joined: "2019-04-09T10:00:00Z", lastSeen: "2024-11-10" },
});

const owner = (overrides = {}) => ({
    onEdit: vi.fn(),
    hideOnline: false,
    ...overrides,
});

describe("AboutCard", () => {
    it("shows a visitor the bio and only the lines filled in", () => {
        renderWithProviders(<AboutCard profile={profile} />);

        expect(screen.getByText("Soulslikes, mostly.")).toBeInTheDocument();
        expect(screen.getByText("they/them")).toBeInTheDocument();
        expect(screen.getByText("35")).toBeInTheDocument();
        expect(screen.getByText("9 April 2019")).toBeInTheDocument();
        expect(screen.getByText("10 November 2024")).toBeInTheDocument();
        expect(screen.queryByText("Location")).toBeNull();
        expect(screen.queryByText(/Not set/)).toBeNull();
        expect(screen.queryByRole("button", { name: /Who sees/ })).toBeNull();
    });

    it("leaves out a fact the viewer isn't allowed", () => {
        renderWithProviders(
            <AboutCard
                profile={buildProfile({
                    bio: "Hi",
                    facts: { lastSeen: "2026-11-05" },
                })}
            />
        );
        expect(screen.queryByText("Age")).toBeNull();
        expect(screen.queryByText("Joined")).toBeNull();
        expect(screen.getByText("Last seen")).toBeInTheDocument();
    });

    it("says someone online now is, whenever they were last seen", () => {
        renderWithProviders(
            <AboutCard profile={{ ...profile, online: true }} />
        );
        expect(screen.getByText("Online now")).toHaveClass("text-success");
    });

    it("leaves a past last seen in the plain text colour", () => {
        renderWithProviders(<AboutCard profile={profile} />);
        const seen = screen.getByText("Last seen").nextElementSibling;
        expect(seen).toHaveClass("text-content");
        expect(seen).not.toHaveClass("text-success");
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

    it("copies a Discord username, which has no address to go to", async () => {
        const user = userEvent.setup();
        const writeText = vi
            .spyOn(navigator.clipboard, "writeText")
            .mockResolvedValue();
        renderWithProviders(<AboutCard profile={profile} />);

        await user.click(
            screen.getByRole("button", {
                name: "Copy Discord username devuser",
            })
        );
        expect(writeText).toHaveBeenCalledWith("devuser");
    });

    it("draws nothing for a visitor when there is nothing to say", () => {
        const { container } = renderWithProviders(
            <AboutCard
                profile={buildProfile({ bio: "", about: {}, facts: {} })}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("shows its owner every line, and sends them to Settings for who sees it", () => {
        renderWithProviders(<AboutCard profile={profile} owner={owner()} />);

        expect(screen.getAllByText("Not set")).toHaveLength(2);
        expect(screen.queryByRole("button", { name: /Who sees/ })).toBeNull();
        expect(
            screen.getByRole("link", { name: "Privacy settings" })
        ).toHaveAttribute("href", "/settings?section=privacy");
    });

    it("tells its owner last seen goes with their online status", () => {
        renderWithProviders(
            <AboutCard
                profile={{
                    ...profile,
                    facts: { joined: "2019-04-09T10:00:00Z" },
                }}
                owner={owner({ hideOnline: true })}
            />
        );
        expect(
            screen.getByText("Hidden with your online status")
        ).toBeInTheDocument();
    });

    it("offers its owner the links not filled in yet, which open the editor", async () => {
        const user = userEvent.setup();
        const onEdit = vi.fn();
        renderWithProviders(
            <AboutCard
                profile={buildProfile({ about: {} })}
                owner={owner({ onEdit })}
            />
        );
        await user.click(screen.getByRole("button", { name: "Steam" }));
        await user.click(screen.getByRole("button", { name: "Edit profile" }));
        expect(onEdit).toHaveBeenCalledTimes(2);
    });
});
