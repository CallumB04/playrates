import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";
import ProfilePicture from "./ProfilePicture";
import UserStatus from "./UserStatus";

/**
 * These assert exact class strings, which is unusual but deliberate.
 *
 * All four of these components used to build their utilities at runtime
 * (`size-${n}`, `${bp}:text-${v}`, ...), which Tailwind cannot see — so they
 * needed a safelist, and the safelist did not actually cover every value
 * passed in. Deleting the safelist is only safe while the class names stay
 * literal, and that is what these tests pin.
 */
describe("LoadingSpinner sizes", () => {
    const sizeOf = (size: "sm" | "md" | "lg") =>
        render(<LoadingSpinner size={size} />).container.firstElementChild!
            .className;

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

    it("keeps the brand colour on the spinning edge", () => {
        expect(sizeOf("md")).toContain("border-t-brand");
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
        expect(className).toContain("lg:border-3");
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
