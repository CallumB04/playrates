import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PatchNoteEditor from "./PatchNoteEditor";

describe("PatchNoteEditor", () => {
    it("publishes a release built from its rows, in the order they're put", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        renderWithProviders(
            <PatchNoteEditor submitLabel="Publish" onSubmit={onSubmit} />
        );

        await user.type(screen.getByLabelText("Title"), "v1.2");
        await user.type(screen.getByLabelText("Change 1"), "Fixed sign in");
        await user.click(
            screen.getByRole("button", { name: "Change 1: kind" })
        );
        await user.click(screen.getByRole("option", { name: /Fix/ }));

        await user.click(screen.getByRole("button", { name: /Add a change/ }));
        await user.type(
            screen.getByLabelText("Change 2"),
            "Added Steam import"
        );
        await user.type(screen.getByLabelText("Change 2: link"), "/settings");
        await user.click(
            screen.getByRole("button", { name: "Move change 2 up" })
        );
        // A new row takes the kind above it; this one's a feature.
        await user.click(
            screen.getByRole("button", { name: "Change 1: kind" })
        );
        await user.click(screen.getByRole("option", { name: /Feature/ }));

        const preview = screen.getByRole("region", {
            name: "How it will look",
        });
        expect(
            within(preview).getByRole("link", { name: /Added Steam import/ })
        ).toHaveAttribute("href", "/settings");

        await user.click(screen.getByRole("button", { name: "Publish" }));
        expect(onSubmit).toHaveBeenCalledWith({
            title: "v1.2",
            intro: null,
            items: [
                {
                    kind: "feature",
                    text: "Added Steam import",
                    link: "/settings",
                },
                { kind: "fix", text: "Fixed sign in", link: null },
            ],
            outro: null,
        });
    });

    it("says what's wrong instead of sending, and marks a bad link", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        renderWithProviders(
            <PatchNoteEditor submitLabel="Publish" onSubmit={onSubmit} />
        );
        await user.type(screen.getByLabelText("Title"), "v1.2");
        await user.type(screen.getByLabelText("Change 1"), "Added it");
        await user.type(screen.getByLabelText("Change 1: link"), "example.com");
        await user.click(screen.getByRole("button", { name: "Publish" }));

        expect(screen.getByRole("alert")).toHaveTextContent(/https/);
        expect(screen.getByLabelText("Change 1: link")).toHaveAttribute(
            "aria-invalid",
            "true"
        );
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("starts from the release being edited, and removing the last row leaves a blank one", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        renderWithProviders(
            <PatchNoteEditor
                initial={{
                    title: "v1.0",
                    intro: "Hello",
                    items: [{ kind: "other", text: "And more", link: null }],
                    outro: "Thanks",
                }}
                submitLabel="Save"
                onSubmit={vi.fn()}
                onCancel={onCancel}
            />
        );
        expect(screen.getByLabelText("Title")).toHaveValue("v1.0");
        expect(screen.getByLabelText(/Message at the top/)).toHaveValue(
            "Hello"
        );
        expect(screen.getByLabelText(/Message at the bottom/)).toHaveValue(
            "Thanks"
        );
        expect(screen.getByLabelText("Change 1")).toHaveValue("And more");

        await user.click(
            screen.getByRole("button", { name: "Remove change 1" })
        );
        expect(screen.getByLabelText("Change 1")).toHaveValue("");

        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onCancel).toHaveBeenCalled();
    });
});
