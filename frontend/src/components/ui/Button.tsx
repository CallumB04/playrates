import type { ButtonHTMLAttributes } from "react";
import {
    buttonClass,
    type ButtonSize,
    type ButtonVariant,
} from "./buttonClass";

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
