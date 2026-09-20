import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
        render(<LoadingSpinner size={size} />).container.firstElementChild!.getAttribute(
            "class"
        )!;

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

    it("gives two usernames different generated hues", () => {
        const hueOf = (username: string) =>
            render(
                <MemoryRouter>
                    <ProfilePicture
                        variant="nav"
                        username={username}
                        file=""
                        link={false}
                    />
                </MemoryRouter>
            )
                .container.querySelector("[style*='linear-gradient']")!
                .getAttribute("style");

        expect(hueOf("marlowe")).not.toBe(hueOf("tessellate"));
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
    it("defaults to the responsive size used by the profile header", () => {
        const { container } = render(<UserStatus status="online" />);
        const label = container.querySelector("p")!;
        expect(label.className).toContain("text-sm");
        expect(label.className).toContain("sm:text-lg");
    });

    it("maps the status onto a semantic colour token", () => {
        const online = render(<UserStatus status="online" />);
        expect(online.container.querySelector(".size-2")!.className).toContain(
            "bg-success"
        );

        const offline = render(<UserStatus status="offline" />);
        expect(offline.container.querySelector(".size-2")!.className).toContain(
            "bg-danger"
        );
    });
});
