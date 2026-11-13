import { Link } from "react-router-dom";
import { BRAND_NAME } from "../../constants/brand";

/** The mark and the name, as the footer has them, in white over the art. */
const BrandLockup = () => (
    <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-2.5 rounded-sm lift hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-on-media"
    >
        <img
            src="/favicon.svg"
            alt=""
            className="size-8 rounded-[8px] shadow-plate"
        />
        <span className="font-display text-xl font-bold">{BRAND_NAME}</span>
    </Link>
);

export default BrandLockup;
