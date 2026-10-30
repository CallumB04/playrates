import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import ReactionBar from "./ReactionBar";

// The purchase popup reads who's signed in. The same one each render.
const auth = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
auth.user = buildProfile();

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

    // Hung inside the bar, a list's card with overflow hidden cut it off.
    it("floats the picker over the page, outside the bar's card", async () => {
        const { onReact, user } = bar();
        const card = screen
            .getByRole("button", { name: "Add a reaction" })
            .closest("div")!;
        await user.click(
            screen.getByRole("button", { name: "Add a reaction" })
        );
        const picker = screen.getByRole("dialog", { name: "Reactions" });
        expect(card.contains(picker)).toBe(false);
        expect(picker.style.position).toBe("fixed");

        // Pressing inside it isn't taken for a press outside.
        await user.click(
            within(picker).getByRole("button", { name: /^Upvote/ })
        );
        expect(onReact).toHaveBeenCalledWith("upvote");
    });

    // A reaction from the shop is bought where you are, not in the shop.
    it("sells a shop reaction in place, then reacts with it", async () => {
        const bought = vi.fn();
        server.use(
            http.get("http://localhost:3000/api/v1/shop", () =>
                HttpResponse.json({
                    tokens: 100,
                    items: [
                        {
                            item: "react_goat",
                            kind: "reaction",
                            group: "reaction",
                            label: "GOAT",
                            price: 60,
                            owned: 0,
                            maxOwned: 1,
                            affordable: true,
                        },
                    ],
                })
            ),
            http.get(
                "http://localhost:3000/api/v1/progress/devuser/badges",
                () =>
                    HttpResponse.json({
                        level: 3,
                        xp: 400,
                        frame: null,
                        held: [],
                        showcase: [],
                        layout: "row",
                        progress: [],
                    })
            ),
            http.post(
                "http://localhost:3000/api/v1/shop/react_goat/buy",
                () => {
                    bought();
                    return HttpResponse.json({ tokens: 40, owned: 1 });
                }
            )
        );
        const { onReact, user } = bar();
        await user.click(
            screen.getByRole("button", { name: "Add a reaction" })
        );
        await user.click(screen.getByRole("button", { name: "Get GOAT" }));

        const sheet = await screen.findByRole("dialog", { name: "GOAT" });
        await user.click(within(sheet).getByRole("button", { name: "Buy" }));

        await waitFor(() => expect(onReact).toHaveBeenCalledWith("goat"));
        expect(bought).toHaveBeenCalledOnce();
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
