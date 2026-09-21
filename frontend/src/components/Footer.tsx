import { Link } from "react-router-dom";

/* The pages a site taking accounts has to have somewhere, and nothing else.
   A footer that lists every route is a sitemap, which is not what this is. */
const LINKS = [
    { to: "/about", label: "About" },
    { to: "/privacy", label: "Privacy" },
    { to: "/terms", label: "Terms" },
    { to: "/contact", label: "Contact" },
];

const Footer = () => (
    <footer className="mx-auto w-full max-w-[1240px] px-5 pb-10 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 border-t border-subtle pt-5 text-label text-content-muted sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {LINKS.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="lift text-content-secondary hover:text-brand"
                    >
                        {link.label}
                    </Link>
                ))}
                <button
                    type="button"
                    onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    className="lift cursor-pointer text-content-secondary hover:text-brand"
                >
                    Back to top
                </button>
            </nav>

            <p className="flex flex-wrap items-center gap-x-2">
                <span>© 2026 PlayRates</span>
                <span aria-hidden>·</span>
                <span>
                    Built by{" "}
                    <span className="text-content-secondary">
                        Callum Burgoyne
                    </span>
                </span>
            </p>
        </div>

        {/* RAWG's terms require attribution wherever their data is shown,
            and it is shown on every page of this site. */}
        <p className="mt-3 text-label-sm text-content-muted">
            Game data from RAWG.
        </p>
    </footer>
);

export default Footer;
