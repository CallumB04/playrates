import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import ReactionBar from "./ReactionBar";

const bar = (props: Partial<Parameters<typeof ReactionBar>[0]> = {}) => {
    const onReact = vi.fn((): unknown => new Promise(() => {}));
    renderWithProviders(
        <ReactionBar
            voteCount={3}
            myReaction={null}
            reactions={[{ reaction: "upvote", count: 3 }]}
            onReact={onReact}
            {...props}
        />
    );
    return { onReact, user: userEvent.setup() };
};

describe("ReactionBar", () => {
    it("shows an upvote the moment it is pressed, before the server answers", async () => {
        const { onReact, user } = bar();
        await user.click(
            screen.getByRole("button", { name: "Upvote this review" })
        );

        const upvote = screen.getByRole("button", {
            name: "Remove your upvote",
        });
        expect(upvote).toHaveAttribute("aria-pressed", "true");
        expect(upvote).toHaveTextContent("4");
        expect(onReact).toHaveBeenCalledWith("upvote");
    });

    it("takes it back when the request fails", async () => {
        const { user } = bar({
            onReact: () => Promise.reject(new Error("no")),
        });
        await user.click(
            screen.getByRole("button", { name: "Upvote this review" })
        );
        expect(
            await screen.findByRole("button", { name: "Upvote this review" })
        ).toHaveTextContent("3");
    });

    it("shows other reactions people left beside the upvote", () => {
        bar({
            reactions: [
                { reaction: "upvote", count: 2 },
                { reaction: "fire", count: 5 },
            ],
        });
        expect(
            screen.getByRole("button", { name: "React Fire, 5 so far" })
        ).toBeInTheDocument();
    });

    it("offers only the reactions the viewer has unlocked", async () => {
        const { user } = bar();
        await user.click(
            screen.getByRole("button", { name: "Add a reaction" })
        );
        const picker = within(
            screen.getByRole("dialog", { name: "Reactions" })
        );
        expect(picker.getByRole("button", { name: /^Upvote/ })).toBeEnabled();
        expect(picker.getByRole("button", { name: /^Fire/ })).toBeDisabled();
    });

    it("shows no noughts: with nothing left yet, only the plus", async () => {
        const { onReact, user } = bar({ voteCount: 0, reactions: [] });
        expect(screen.queryByRole("button", { name: /Upvote/ })).toBeNull();

        await user.click(
            screen.getByRole("button", { name: "Add a reaction" })
        );
        await user.click(screen.getByRole("button", { name: "Upvote" }));
        expect(onReact).toHaveBeenCalledWith("upvote");
        expect(
            screen.getByRole("button", { name: "Remove your upvote" })
        ).toHaveTextContent("1");
    });

    it("shows nothing at all where nobody can react and nobody has", () => {
        const { container } = renderWithProviders(
            <ReactionBar
                voteCount={0}
                myReaction={null}
                reactions={[]}
                onReact={() => {}}
                disabledReason="Join to react"
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("lets nobody react while saying why, and still shows the count", () => {
        bar({ disabledReason: "Join to react" });
        expect(
            screen.getByRole("button", { name: "3 upvotes. Join to react" })
        ).toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Add a reaction" })
        ).toBeNull();
    });
});
