import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

/** Across to the other step, signing up or logging in, keeping where you
 *  came from so either still takes you back there. */
const SwitchLink = ({
    to,
    children,
}: {
    to: "/join" | "/login";
    children: ReactNode;
}) => {
    const { state } = useLocation();
    return (
        <Link
            to={to}
            state={state}
            replace
            className="relative font-medium text-brand-text before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
        >
            {children}
        </Link>
    );
};

export default SwitchLink;
