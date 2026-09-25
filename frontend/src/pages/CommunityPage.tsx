import { Link } from "react-router-dom";
import { cardClass } from "../components/ui/Card";
import { MessagesSquare } from "lucide-react";
import { buttonClass } from "../components/ui/Button";
import { usePageTitle } from "../hooks/usePageTitle";

const CommunityPage = () => {
    usePageTitle("Community");

    return (
        <section
            className={cardClass(
                "relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12",
                { padding: "none" }
            )}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute -top-28 -right-24 size-80 rounded-full bg-brand/12 blur-3xl"
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
};

export default CommunityPage;
