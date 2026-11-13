import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import ShareSheet from "./ShareSheet";

const props = {
    title: "Share it",
    url: "https://playrates.app/user/devuser/gaming-25",
    text: "My Gaming 25",
    imageUrl: "https://api.test/image.png",
    fileName: "devuser-gaming-25.png",
    onClose: vi.fn(),
};

afterEach(() => {
    vi.unstubAllGlobals();
    // jsdom has neither; a test that adds them takes them away again.
    delete (navigator as { share?: unknown }).share;
    delete (navigator as { canShare?: unknown }).canShare;
});

describe("ShareSheet", () => {
    it("offers the download, the link and each network where there's no share sheet", () => {
        renderWithProviders(<ShareSheet {...props} />);

        expect(screen.queryByRole("button", { name: /Share/ })).toBeNull();
        expect(
            screen.getByRole("button", { name: "Download" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Copy" })
        ).toBeInTheDocument();
        expect(
            screen.getByText("playrates.app/user/devuser/gaming-25")
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "X" })).toHaveAttribute(
            "target",
            "_blank"
        );
        expect(screen.getAllByRole("link")).toHaveLength(6);
    });

    it("stays grey, with nothing to download, until it knows which picture", () => {
        const { container } = renderWithProviders(
            <ShareSheet {...props} imageUrl={undefined} />
        );
        expect(container.ownerDocument.querySelector("img")).toBeNull();
        expect(
            container.ownerDocument.querySelector(".animate-pulse")
        ).not.toBeNull();
        expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
    });

    it("hands the picture itself to a share sheet that takes files", async () => {
        const share = vi.fn(async () => undefined);
        Object.assign(navigator, { share, canShare: () => true });
        // The page's own Blob, as a browser's fetch hands back: Node's
        // Response would give Node's, which jsdom's File won't take on
        // every Node version.
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => ({
                ok: true,
                status: 200,
                blob: async () => new Blob(["png"], { type: "image/png" }),
            }))
        );
        renderWithProviders(<ShareSheet {...props} />);

        await userEvent.click(
            screen.getByRole("button", { name: "Share the picture" })
        );

        await waitFor(() => expect(share).toHaveBeenCalledOnce());
        const [data] = share.mock.calls[0] as unknown as [
            { files: File[]; text: string },
        ];
        expect(data.files[0].name).toBe("devuser-gaming-25.png");
        expect(data.text).toBe(`My Gaming 25 ${props.url}`);
    });

    it("shares only the link where files can't go", async () => {
        const share = vi.fn(async () => undefined);
        Object.assign(navigator, { share, canShare: () => false });
        renderWithProviders(<ShareSheet {...props} />);

        await userEvent.click(screen.getByRole("button", { name: "Share" }));

        expect(share).toHaveBeenCalledWith({
            title: "My Gaming 25",
            text: "My Gaming 25",
            url: props.url,
        });
    });
});
