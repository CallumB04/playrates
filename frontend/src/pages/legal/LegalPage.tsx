import { Link } from "react-router-dom";
import { buttonClass } from "../../components/ui/Button";

interface LegalPageProps {
    title: string;
    /** One line on what this page will cover once it is written. */
    summary: string;
}

/**
 * A stub with an honest sign on it.
 *
 * These exist because a site that takes accounts needs somewhere for its
 * terms and its privacy policy to live, and the footer should not link into
 * nothing. The copy is deliberately not a draft policy: an invented one that
 * looks finished is worse than a page that says it is not written yet.
 */
const LegalPage = ({ title, summary }: LegalPageProps) => (
    <article className="mx-auto flex w-full max-w-[60ch] flex-col gap-5 py-6">
        <header>
            <h1 className="font-display text-title text-content">{title}</h1>
            <p className="mt-2.5 text-body text-content-secondary">{summary}</p>
        </header>

        <div className="rounded-lg border border-dashed border-strong bg-surface-sunken/60 px-5 py-6">
            <p className="text-body-sm text-content-secondary">
                This page has not been written yet. PlayRates is not open to
                the public, so there is nothing here that anyone is relying on.
            </p>
            <p className="mt-3 text-body-sm text-content-secondary">
                If you need to reach someone in the meantime, the account that
                runs this site is the one to ask.
            </p>
        </div>

        <div>
            <Link to="/" className={buttonClass("secondary")}>
                Back to home
            </Link>
        </div>
    </article>
);

export default LegalPage;
