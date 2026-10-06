import { Link } from "react-router-dom";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { BRAND_MOTTO, BRAND_NAME } from "../constants/brand";
import { cn } from "../lib/cn";

const COLUMNS = [
    {
        heading: "Explore",
        links: [
            { to: "/library", label: "Library" },
            { to: "/community", label: "Community" },
        ],
    },
    {
        heading: BRAND_NAME,
        links: [
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { to: "/privacy", label: "Privacy" },
            { to: "/terms", label: "Terms" },
        ],
    },
];

const LINK =
    "inline-flex min-h-11 items-center text-body-sm text-content-secondary lift hover:text-content sm:min-h-8";

const SMALL_LINK =
    "inline-flex min-h-11 items-center gap-1.5 text-label text-content-muted lift hover:text-content sm:min-h-0";

const Footer = () => (
    <footer className="relative mt-16 overflow-hidden border-t border-subtle bg-surface-sunken">
        {/* The brand's light catching the top edge. */}
        <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand/60 to-transparent"
        />
        <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,color-mix(in_oklab,var(--brand)_12%,transparent),transparent)]"
        />

        <div className="relative mx-auto w-full max-w-[1240px] px-5 pt-12 sm:px-8 sm:pt-14 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
                <div>
                    <Link
                        to="/"
                        className="inline-flex min-h-11 items-center gap-3 lift hover:opacity-90"
                    >
                        <img
                            src="/favicon.svg"
                            alt=""
                            className="size-9 rounded-[9px] shadow-plate"
                        />
                        <span className="font-display text-2xl font-bold text-content">
                            {BRAND_NAME}
                        </span>
                    </Link>
                    <p className="mt-3 max-w-[32ch] text-body text-content-secondary">
                        {BRAND_MOTTO}
                    </p>
                </div>

                <nav
                    aria-label="Footer"
                    className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3"
                >
                    {COLUMNS.map((column) => (
                        <div key={column.heading}>
                            <h2 className="text-label-sm font-medium tracking-[0.14em] text-content-muted uppercase">
                                {column.heading}
                            </h2>
                            <ul className="mt-3 flex flex-col sm:gap-1">
                                {column.links.map((link) => (
                                    <li key={link.to}>
                                        <Link to={link.to} className={LINK}>
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </div>

            <div className="mt-12 flex flex-col gap-2 border-t border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="flex flex-wrap items-center gap-x-2 text-label text-content-muted">
                    <span>
                        © {new Date().getFullYear()} {BRAND_NAME}
                    </span>
                    <span aria-hidden>·</span>
                    {/* RAWG's terms ask for an active link back wherever
                        their data is shown, and it is shown on every page. */}
                    <a
                        href="https://rawg.io"
                        target="_blank"
                        rel="noreferrer noopener"
                        className={SMALL_LINK}
                    >
                        Game data from RAWG
                        <ArrowUpRight size={13} aria-hidden />
                    </a>
                </p>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <a
                        href="https://github.com/CallumB04"
                        target="_blank"
                        rel="noreferrer noopener"
                        className={SMALL_LINK}
                    >
                        <SiGithub size={14} aria-hidden />
                        Built by Callum Burgoyne
                    </a>
                    <button
                        type="button"
                        onClick={() =>
                            window.scrollTo({ top: 0, behavior: "smooth" })
                        }
                        aria-label="Back to top"
                        title="Back to top"
                        className={cn(
                            "relative grid size-9 cursor-pointer place-items-center rounded-full border border-subtle bg-surface-raised text-content-secondary lift hover:border-strong hover:text-content",
                            "before:absolute before:-inset-1 before:content-['']"
                        )}
                    >
                        <ArrowUp size={15} aria-hidden />
                    </button>
                </div>
            </div>
        </div>

        {/* The name, set large and let fade into the floor: the last thing
            on every page. */}
        <p
            aria-hidden
            className="pointer-events-none relative mx-auto -mb-[0.2em] max-w-[1240px] bg-linear-to-b from-content/[0.09] to-transparent bg-clip-text px-3 text-center font-display text-[clamp(4.5rem,19vw,14rem)] leading-none font-bold tracking-[-0.04em] whitespace-nowrap text-transparent select-none"
        >
            {BRAND_NAME}
        </p>
    </footer>
);

export default Footer;
