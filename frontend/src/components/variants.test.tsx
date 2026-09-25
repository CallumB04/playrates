import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ProfileAccent } from "@playrates/shared";
import LoadingSpinner from "./LoadingSpinner";
import ProfilePicture from "./ProfilePicture";
import UserStatus from "./UserStatus";

/* Asserting exact class strings is unusual but deliberate: a variant map
   composed at runtime gets purged by Tailwind and the component renders
   unstyled with nothing else failing. */
describe("LoadingSpinner sizes", () => {
    /* It is an <svg> now, so className is an SVGAnimatedString rather than a
       string — getAttribute is the only reading that works for both. */
    const sizeOf = (size: "sm" | "md" | "lg") =>
        render(
            <LoadingSpinner size={size} />
        ).container.firstElementChild!.getAttribute("class")!;

    it("emits complete class names per size", () => {
        expect(sizeOf("sm")).toContain("size-4");
        expect(sizeOf("md")).toContain("size-7");
        expect(sizeOf("md")).toContain("md:size-8");
        expect(sizeOf("lg")).toContain("size-9");
        expect(sizeOf("lg")).toContain("md:size-10");
    });

    it("never contains an unresolved template expression", () => {
        for (const size of ["sm", "md", "lg"] as const) {
            expect(sizeOf(size)).not.toContain("${");
            expect(sizeOf(size)).not.toContain("undefined");
        }
    });

    it("takes its colour from the text colour it inherits", () => {
        // currentColor, so a spinner inside a brand button is legible without
        // the caller overriding anything.
        const { container } = render(<LoadingSpinner size="md" />);
        expect(container.querySelector("circle")).toHaveAttribute(
            "stroke",
            "currentColor"
        );
    });

    /* Beside "Searching…" it would be announced twice over. */
    it("keeps quiet when the text beside it already says", () => {
        const { container } = render(<LoadingSpinner size="xs" label={null} />);
        expect(screen.queryByRole("status")).toBeNull();
        expect(container.querySelector("svg")).toHaveAttribute(
            "aria-hidden",
            "true"
        );
    });

    it("announces itself as a status region", () => {
        render(<LoadingSpinner size="md" />);
        expect(screen.getByRole("status")).toHaveAccessibleName("Loading");
    });
});

describe("ProfilePicture variants", () => {
    const classOf = (
        variant: Parameters<typeof ProfilePicture>[0]["variant"]
    ) =>
        render(
            <MemoryRouter>
                <ProfilePicture
                    variant={variant}
                    username="devuser"
                    file=""
                    link={false}
                />
            </MemoryRouter>
        ).container.firstElementChild!.className;

    it("emits the responsive profile header sizes", () => {
        const className = classOf("profileHeader");
        expect(className).toContain("size-20");
        expect(className).toContain("sm:size-28");
        expect(className).toContain("lg:size-40");
    });

    /* The initial has to grow with the box, or it sits as a speck in the
       middle of a 160px disc. */
    it("scales the generated initial with the avatar", () => {
        const { container } = render(
            <MemoryRouter>
                <ProfilePicture
                    variant="profileHeader"
                    username="devuser"
                    file=""
                    link={false}
                />
            </MemoryRouter>
        );
        const initial = screen.getByText("D");
        expect(initial.className).toContain("lg:text-6xl");
        // the hue is derived, so the gradient must be inline
        const wash = container.querySelector("[style*='linear-gradient']");
        expect(wash).not.toBeNull();
    });

    /* The hue used to come from the username. It comes from the profile's
       chosen colour now, so two names share one colour and two colours do
       not. */
    it("colours the generated avatar by the accent, not the name", () => {
        const fillOf = (username: string, accent?: ProfileAccent) =>
            render(
                <MemoryRouter>
                    <ProfilePicture
                        variant="nav"
                        username={username}
                        accent={accent}
                        file=""
                        link={false}
                    />
                </MemoryRouter>
            )
                .container.querySelector("[style*='linear-gradient']")!
                .getAttribute("style");

        expect(fillOf("marlowe")).toBe(fillOf("tessellate"));
        expect(fillOf("marlowe", "jade")).not.toBe(fillOf("marlowe", "rose"));
    });

    it("prefers an uploaded picture over the generated one", () => {
        render(
            <MemoryRouter>
                <ProfilePicture
                    variant="nav"
                    username="devuser"
                    file="https://example.test/a.png"
                    link={false}
                />
            </MemoryRouter>
        );
        expect(screen.getByAltText(/devuser/i)).toBeInTheDocument();
        expect(screen.queryByText("D")).toBeNull();
    });

    it("emits a single size for the fixed variants", () => {
        expect(classOf("editProfile")).toContain("size-40");
        expect(classOf("review")).toContain("size-16");
        expect(classOf("friendRow")).toContain("size-10");
        expect(classOf("friendRowLarge")).toContain("size-12");
    });

    it("never contains an unresolved template expression", () => {
        for (const variant of [
            "profileHeader",
            "editProfile",
            "review",
            "friendRow",
            "friendRowLarge",
        ] as const) {
            expect(classOf(variant)).not.toContain("${");
        }
    });

    it("renders an image with alt text only when there is a picture", () => {
        const withPicture = render(
            <MemoryRouter>
                <ProfilePicture
                    variant="review"
                    username="devuser"
                    file="https://example.test/a.png"
                    link={false}
                />
            </MemoryRouter>
        );
        expect(
            withPicture.getByAltText("devuser's profile picture")
        ).toBeInTheDocument();

        const withoutPicture = render(
            <MemoryRouter>
                <ProfilePicture
                    variant="review"
                    username="devuser"
                    file=""
                    link={false}
                />
            </MemoryRouter>
        );
        expect(withoutPicture.container.querySelector("img")).toBeNull();
    });

    it("renders a link only when asked, to avoid nesting anchors", () => {
        const linked = render(
            <MemoryRouter>
                <ProfilePicture
                    variant="review"
                    username="devuser"
                    file=""
                    link
                />
            </MemoryRouter>
        );
        expect(linked.container.querySelector("a")).not.toBeNull();

        const plain = render(
            <MemoryRouter>
                <ProfilePicture
                    variant="review"
                    username="devuser"
                    file=""
                    link={false}
                />
            </MemoryRouter>
        );
        expect(plain.container.querySelector("a")).toBeNull();
    });
});

describe("UserStatus", () => {
    it("says online in the success colour", () => {
        const { container } = render(<UserStatus online />);
        expect(container.textContent).toBe("Online");
        expect(container.firstElementChild!.className).toContain(
            "text-success"
        );
        expect(container.querySelector("[aria-hidden]")!.className).toContain(
            "bg-success"
        );
    });

    /* Being away is not an error: it used to be red, while PresenceDot drew
       the same person muted on their avatar. */
    it("says offline muted, not as a warning", () => {
        const { container } = render(<UserStatus online={false} />);
        expect(container.textContent).toBe("Offline");
        const dot = container.querySelector("[aria-hidden]")!;
        expect(dot.className).toContain("bg-content-muted");
        expect(dot.className).not.toContain("danger");
    });

    it("emits a complete class name per size", () => {
        const sm = render(<UserStatus online size="sm" />);
        expect(sm.container.firstElementChild!.className).toContain(
            "text-label-sm"
        );
    });
});
