import { Link } from "react-router-dom";
import { Gamepad2, MessageSquare, Tags } from "lucide-react";
import { buttonClass } from "../components/ui/Button";

/* What the feature is for, said concretely. A "coming soon" page with no
   shape to it is just an apology. */
const PLANNED = [
    {
        icon: Tags,
        title: "Threads by genre",
        body: "One place per genre, so a question about roguelikes lands in front of people who play them.",
    },
    {
        icon: Gamepad2,
        title: "A board per game",
        body: "Tied to the library, so a game's discussion sits beside its reviews rather than somewhere else entirely.",
    },
    {
        icon: MessageSquare,
        title: "Platform and hardware talk",
        body: "The conversations that are about the thing you play on rather than the thing you play.",
    },
];

const CommunityPage = () => (
    <div className="flex flex-col gap-8 py-2">
        <header className="relative overflow-hidden rounded-lg border border-subtle bg-surface-raised px-6 py-8 shadow-plate sm:px-8 sm:py-10">
            <span
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"
            />
            <div className="relative">
                <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand-subtle px-3 py-1 text-label text-brand">
                    Coming soon
                </span>

                <h1 className="mt-4 max-w-[18ch] font-display text-title text-content">
                    Somewhere to talk about all of it.
                </h1>

                <p className="mt-3 max-w-[54ch] text-body leading-relaxed text-content-secondary">
                    Reviews say what you thought of a game. Community is for
                    everything around that: what to play next, whether the
                    remaster is worth it, and which genre is quietly having a
                    good year.
                </p>

                <p className="mt-5 text-body-sm text-content-muted">
                    Not built yet. This page exists so the plan is written down
                    somewhere other than my head.
                </p>
            </div>
        </header>

        <section>
            <h2 className="mb-4 font-display text-section text-content">
                What it will hold
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
                {PLANNED.map((item) => (
                    <div
                        key={item.title}
                        className="rounded-md border border-subtle bg-surface-raised px-4 py-4"
                    >
                        <span className="flex size-8 items-center justify-center rounded-sm bg-brand-subtle text-brand">
                            <item.icon size={15} aria-hidden />
                        </span>
                        <h3 className="mt-3 text-body-sm font-medium text-content">
                            {item.title}
                        </h3>
                        <p className="mt-1 text-body-sm leading-relaxed text-content-secondary">
                            {item.body}
                        </p>
                    </div>
                ))}
            </div>
        </section>

        <div className="flex flex-wrap gap-3">
            <Link to="/library" className={buttonClass("primary")}>
                Browse the library
            </Link>
            <Link to="/" className={buttonClass("secondary")}>
                Back to home
            </Link>
        </div>
    </div>
);

export default CommunityPage;
