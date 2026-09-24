import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProfilePicture from "./ProfilePicture";
import { accentHue } from "../lib/profileAccent";

const show = (props: Partial<Parameters<typeof ProfilePicture>[0]> = {}) =>
    render(
        <MemoryRouter>
            <ProfilePicture
                variant="profileHeader"
                username="ada"
                file=""
                link={false}
                {...props}
            />
        </MemoryRouter>
    );

describe("ProfilePicture", () => {
    it("links to the profile when asked to", () => {
        show({ link: true });
        expect(screen.getByRole("link")).toHaveAttribute("href", "/user/ada");
    });

    it("is inert otherwise", () => {
        show();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    describe("its colour", () => {
        const fill = (c: HTMLElement) =>
            c.querySelector<HTMLElement>("span[aria-hidden]")?.style
                .backgroundImage ?? "";

        it("is the brand when no colour is given", () => {
            const { container } = show({ accent: undefined });
            expect(fill(container)).toContain(`hsl(${accentHue("playrates")}`);
        });

        it("is the chosen colour when there is one", () => {
            const { container } = show({ accent: "jade" });
            expect(fill(container)).toContain("hsl(150");
            expect(fill(container)).not.toContain(
                `hsl(${accentHue("playrates")}`
            );
        });

        /* An uploaded picture covers the fill entirely, so the colour only
           ever shows on the generated one. */
        it("is not drawn behind an uploaded picture", () => {
            const { container } = show({
                accent: "jade",
                file: "https://cdn.test/ada.webp",
            });
            expect(container.querySelector("span[aria-hidden]")).toBeNull();
        });
    });

    describe("as a control", () => {
        const action = () => ({ label: "Change your profile picture", onClick: vi.fn() });

        it("becomes a button that says what it does", async () => {
            const user = userEvent.setup();
            const a = action();
            show({ action: a });

            const button = screen.getByRole("button", {
                name: "Change your profile picture",
            });
            await user.click(button);

            expect(a.onClick).toHaveBeenCalledOnce();
        });

        it("is reachable and operable from the keyboard", async () => {
            const user = userEvent.setup();
            const a = action();
            show({ action: a });

            await user.tab();
            expect(screen.getByRole("button")).toHaveFocus();
            await user.keyboard("{Enter}");

            expect(a.onClick).toHaveBeenCalledOnce();
        });

        /* A touch screen cannot hover, so the badge has to be there before
           anyone points at it. */
        it("shows the camera without needing a hover", () => {
            const { container } = show({ action: action() });
            const badge = container.querySelector("svg.lucide-camera");

            expect(badge).toBeInTheDocument();
            expect(badge?.closest("span")?.className).not.toMatch(
                /(^|\s|:)opacity-0/
            );
        });

        it("never offers a link as well — that would nest two controls", () => {
            show({ link: true, action: action() });
            expect(screen.getByRole("button")).toBeInTheDocument();
            expect(screen.queryByRole("link")).not.toBeInTheDocument();
        });

        it("keeps the uploaded picture behind the badge", () => {
            show({ file: "https://cdn.test/ada.webp", action: action() });
            expect(screen.getByRole("img")).toHaveAttribute(
                "src",
                "https://cdn.test/ada.webp"
            );
        });
    });
});
