/**
 * A colophon, not a sitemap. The social links have no destinations yet, so
 * they are rendered as plain marks rather than links that go nowhere.
 */
const Footer = () => (
    <footer className="mx-auto w-full max-w-[1240px] px-5 pb-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-strong pt-5 text-label text-content-muted">
            <p>
                Created by{" "}
                <span className="text-content-secondary">Callum Burgoyne</span>
            </p>
            <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="plate-press text-content-secondary hover:text-brand"
            >
                Back to top
            </button>
            <p>© 2024 PlayRates</p>
        </div>
    </footer>
);

export default Footer;
