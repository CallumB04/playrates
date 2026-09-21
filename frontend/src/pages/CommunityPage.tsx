import { Link } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { buttonClass } from "../components/ui/Button";

const CommunityPage = () => (
    <section className="relative overflow-hidden rounded-lg border border-subtle bg-surface-raised px-6 py-10 shadow-plate sm:px-10 sm:py-12">
        <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-brand/12 blur-3xl"
        />

        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
            <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-brand-subtle text-brand">
                <MessagesSquare size={26} aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
                {/* A dotted rule and a word, rather than a pill that looks
                    like a status chip on a page with no statuses. */}
                <span className="flex items-center gap-2.5 text-label text-brand">
                    In development
                    <span
                        aria-hidden
                        className="h-px w-10 bg-brand/40 sm:w-16"
                    />
                </span>

                <h1 className="mt-2.5 font-display text-title text-content">
                    Community
                </h1>

                <p className="mt-2 max-w-[54ch] text-body leading-relaxed text-content-secondary">
                    Threads for genres, games and platforms. A place to talk
                    about what you play, not just log it.
                </p>
            </div>

            <Link
                to="/library"
                className={buttonClass("secondary", "shrink-0")}
            >
                Browse the library
            </Link>
        </div>
    </section>
);

export default CommunityPage;
