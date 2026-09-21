import { Link } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { buttonClass } from "../components/ui/Button";

const CommunityPage = () => (
    <div className="flex min-h-[55vh] items-center justify-center py-8">
        <section className="relative w-full max-w-lg overflow-hidden rounded-lg border border-subtle bg-surface-raised px-6 py-10 text-center shadow-plate sm:px-10">
            <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand/12 blur-3xl"
            />

            <div className="relative flex flex-col items-center">
                <span className="grid size-12 place-items-center rounded-full bg-brand-subtle text-brand">
                    <MessagesSquare size={22} aria-hidden />
                </span>

                <span className="mt-5 inline-flex items-center rounded-full border border-brand/30 bg-brand-subtle px-3 py-1 text-label text-brand">
                    Coming soon
                </span>

                <h1 className="mt-4 font-display text-title text-content">
                    Community
                </h1>

                <p className="mt-2.5 max-w-[40ch] text-body leading-relaxed text-content-secondary">
                    Threads for genres, games and platforms. A place to talk
                    about what you play, not just log it.
                </p>

                <Link to="/library" className={buttonClass("primary", "mt-6")}>
                    Browse the library
                </Link>
            </div>
        </section>
    </div>
);

export default CommunityPage;
