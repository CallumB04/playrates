import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const BASE =
    "lift inline-flex items-center justify-center gap-2 rounded-sm border text-center " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
    "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed hover:cursor-pointer " +
    "disabled:hover:translate-y-0 aria-disabled:hover:translate-y-0";

const SIZES = {
    sm: "min-h-9 px-3 text-[12.5px]",
    /** 44px on a phone, tightening to 40 where there's a pointer. */
    md: "min-h-11 px-4 text-body-sm sm:min-h-10",
    lg: "min-h-12 px-6 text-[14.5px]",
    /** The mobile sheet's 48px floor. */
    touch: "min-h-12 px-5 text-sm",
} as const;

/**
 * Five variants across rest, hover, pressed and disabled. The gesture is a
 * lift: hover rises and gathers light, press settles back down.
 */
const VARIANTS = {
    primary:
        "font-semibold text-content-on-solid bg-brand border-brand-deep shadow-solid " +
        "hover:-translate-y-px hover:bg-brand-hover hover:shadow-glow " +
        "active:translate-y-0 active:bg-brand-active active:shadow-none " +
        "disabled:bg-surface-sunken disabled:text-content-muted disabled:border-subtle disabled:shadow-none " +
        "aria-disabled:bg-surface-sunken aria-disabled:text-content-muted aria-disabled:border-subtle aria-disabled:shadow-none",

    secondary:
        "font-medium text-content bg-surface-raised border-subtle shadow-lip " +
        "hover:-translate-y-px hover:bg-surface-hover hover:shadow-plate " +
        "active:translate-y-0 active:shadow-none " +
        "disabled:bg-surface-sunken disabled:text-content-muted disabled:shadow-none " +
        "aria-disabled:bg-surface-sunken aria-disabled:text-content-muted aria-disabled:shadow-none",

    outline:
        "font-medium text-content bg-transparent border-strong " +
        "hover:-translate-y-px hover:border-brand hover:bg-surface-hover " +
        "active:translate-y-0 active:bg-surface-active " +
        "disabled:text-content-muted disabled:border-subtle " +
        "aria-disabled:text-content-muted aria-disabled:border-subtle",

    ghost:
        "font-medium text-content-secondary bg-transparent border-transparent " +
        "hover:bg-surface-hover hover:text-content " +
        "active:bg-surface-active " +
        "disabled:text-content-muted aria-disabled:text-content-muted",

    danger:
        "font-semibold text-content-on-solid bg-danger border-danger shadow-solid " +
        "hover:-translate-y-px hover:shadow-lifted " +
        "active:translate-y-0 active:shadow-none " +
        "disabled:bg-surface-sunken disabled:text-content-muted disabled:border-subtle disabled:shadow-none " +
        "aria-disabled:bg-surface-sunken aria-disabled:text-content-muted aria-disabled:border-subtle aria-disabled:shadow-none",

    /** Shape and lift only, for controls that colour themselves from state. */
    bare: "border font-medium",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export const BUTTON_VARIANTS = Object.keys(VARIANTS) as ButtonVariant[];
export const BUTTON_SIZES = Object.keys(SIZES) as ButtonSize[];

/** For elements that need the button look but aren't buttons, e.g. Link. */
export const buttonClass = (
    variant: ButtonVariant,
    className?: string,
    size: ButtonSize = "md"
): string => cn(BASE, SIZES[size], VARIANTS[variant], className);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const Button = ({
    variant = "primary",
    size = "md",
    className,
    ...props
}: ButtonProps) => (
    <button className={buttonClass(variant, className, size)} {...props} />
);

export default Button;
