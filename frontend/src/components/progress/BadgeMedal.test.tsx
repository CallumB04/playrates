import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { badgeDef } from "@playrates/shared";
import BadgeMedal from "./BadgeMedal";

const collector = badgeDef("collector")!;
const secret = badgeDef("binge")!;

describe("BadgeMedal", () => {
    it("wears its metal once earned", () => {
        const { container } = render(
            <BadgeMedal badge={collector} metal={3} />
        );
        expect(container.firstChild).toHaveClass("metal-gold");
    });

    it("is a blank with its progress drawn round it while still to earn", () => {
        const { container } = render(
            <BadgeMedal badge={collector} metal={null} progress={0.4} />
        );
        expect(container.firstChild).toHaveClass("metal-locked");
        expect(container.querySelector("circle.stroke-brand")).toHaveAttribute(
            "stroke-dasharray",
            "40 100"
        );
    });

    it("rings one already held with how far it is to the next metal", () => {
        const { container } = render(
            <BadgeMedal badge={collector} metal={2} progress={0.5} />
        );
        expect(container.firstChild).toHaveClass("metal-silver");
        expect(container.querySelector("circle.stroke-brand")).toHaveAttribute(
            "stroke-dasharray",
            "50 100"
        );
    });

    it("keeps a secret's icon to itself until it's earned", () => {
        const { container: hidden } = render(
            <BadgeMedal badge={secret} metal={null} />
        );
        const { container: shown } = render(
            <BadgeMedal badge={secret} metal={3} />
        );
        expect(hidden.querySelector("svg")?.getAttribute("class")).toContain(
            "circle-question"
        );
        expect(shown.querySelector("svg")?.getAttribute("class")).toContain(
            "popcorn"
        );
    });
});
