import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvatarField, { type AvatarChoice } from "./AvatarField";

const compressAvatar = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/avatarImage", () => ({ compressAvatar }));

const CURRENT = "https://cdn.test/avatars/ada/avatar.webp?v=1";

const setup = (
    choice: AvatarChoice = { kind: "unchanged" },
    current: string | null = CURRENT
) => {
    const onChange = vi.fn();
    render(
        <MemoryRouter>
            <AvatarField
                username="ada"
                current={current}
                choice={choice}
                onChange={onChange}
            />
        </MemoryRouter>
    );
    return { onChange };
};

const pickFile = async (name = "face.png") => {
    const user = userEvent.setup();
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    await user.upload(input, new File(["bytes"], name, { type: "image/png" }));
};

beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
});

describe("AvatarField", () => {
    it("compresses what was picked and hands back a preview of it", async () => {
        const image = new Blob(["small"], { type: "image/webp" });
        compressAvatar.mockResolvedValue(image);
        const { onChange } = setup();

        await pickFile();

        await waitFor(() =>
            expect(onChange).toHaveBeenCalledWith({
                kind: "picked",
                image,
                preview: "blob:preview",
            })
        );
        expect(compressAvatar).toHaveBeenCalledOnce();
    });

    /* The compressor is the only thing that knows why a file is no good, so
       its message is the one to show. */
    it("shows why a file was refused, and picks nothing", async () => {
        compressAvatar.mockRejectedValue(new Error("That image is over 20MB."));
        const { onChange } = setup();

        await pickFile("huge.png");

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "That image is over 20MB."
        );
        expect(onChange).not.toHaveBeenCalled();
    });

    it("draws the picked picture rather than the saved one", () => {
        setup({
            kind: "picked",
            image: new Blob(),
            preview: "blob:preview",
        });
        expect(screen.getByRole("img")).toHaveAttribute("src", "blob:preview");
    });

    it("drops back to the generated avatar once removed", () => {
        setup({ kind: "removed" });
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("offers Remove only when there is a picture to remove", async () => {
        const user = userEvent.setup();
        const { onChange } = setup();

        await user.click(screen.getByRole("button", { name: "Remove" }));

        expect(onChange).toHaveBeenCalledWith({ kind: "removed" });
    });

    it("has nothing to remove when the avatar is generated", () => {
        setup({ kind: "unchanged" }, null);
        expect(
            screen.queryByRole("button", { name: "Remove" })
        ).not.toBeInTheDocument();
        expect(screen.getByText("Upload")).toBeInTheDocument();
    });

    /* A phone keyboard cannot reach a control that is only 32px tall, and the
       label is the upload control. */
    it("keeps the upload control tappable on a phone", () => {
        setup();
        const label = screen.getByText("Change");
        expect(label).toHaveClass("min-h-11");
        expect(label).toHaveAttribute(
            "for",
            document.querySelector("input[type=file]")!.id
        );
    });
});
