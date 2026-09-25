import { Link } from "react-router-dom";
import { cardClass } from "./ui/Card";
import { ArrowUp } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { BRAND_MOTTO, BRAND_NAME } from "../constants/brand";

// The pages a site taking accounts needs, and nothing else.
const LINKS = [
    { to: "/about", label: "About" },
    { to: "/privacy", label: "Privacy" },
    { to: "/terms", label: "Terms" },
    { to: "/contact", label: "Contact" },
];

const Footer = () => (
    <footer className="mx-auto mt-6 w-full max-w-[1240px] px-5 pb-10 sm:px-8 lg:px-12">
        <div className={cardClass("px-5 py-5 sm:px-6", { padding: "none" })}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="font-display text-xl font-bold text-content">
                        {BRAND_NAME}
                    </p>
                    <p className="mt-1 max-w-[38ch] text-body-sm text-content-secondary">
                        {BRAND_MOTTO}
                    </p>
                </div>

                <nav className="-my-2 flex flex-wrap items-center gap-x-6 text-body-sm sm:my-0 sm:gap-y-2">
                    {LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="inline-flex min-h-11 items-center text-content-secondary lift hover:text-brand sm:min-h-0"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-subtle pt-4 text-label text-content-muted sm:flex-row sm:items-center sm:justify-between">
                <p className="flex flex-wrap items-center gap-x-2">
                    <span>© 2026 PlayRates</span>
                    <span aria-hidden>·</span>
                    {/* RAWG's terms require attribution wherever their data is
                        shown, and it is shown on every page of this site. */}
                    <span>Game data from RAWG</span>
                </p>

                <div className="-my-2 flex items-center gap-4 sm:my-0">
                    <a
                        href="https://github.com/CallumB04"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex min-h-11 items-center gap-1.5 text-content-secondary lift hover:text-brand sm:min-h-0"
                    >
                        <SiGithub size={14} aria-hidden />
                        Built by Callum Burgoyne
                    </a>
                    <button
                        type="button"
                        onClick={() =>
                            window.scrollTo({ top: 0, behavior: "smooth" })
                        }
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-content-secondary lift hover:text-brand sm:min-h-0"
                    >
                        <ArrowUp size={14} aria-hidden />
                        Back to top
                    </button>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
