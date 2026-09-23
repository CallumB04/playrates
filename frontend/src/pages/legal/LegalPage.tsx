import { Link } from "react-router-dom";
import { buttonClass } from "../../components/ui/Button";
import { usePageTitle } from "../../hooks/usePageTitle";

interface LegalPageProps {
    title: string;
    /** One line on what this page will cover once it is written. */
    summary: string;
    /** For a heading that already names the site, so the tab doesn't say it
     *  twice. Defaults to the heading. */
    tabTitle?: string;
}

/**
 * A stub with an honest sign on it. A site taking accounts needs somewhere for
 * its terms to live; an invented policy that looks finished is worse than a
 * page saying it isn't written yet.
 */
const LegalPage = ({ title, summary, tabTitle }: LegalPageProps) => {
    usePageTitle(tabTitle ?? title);

    return (
        <article className="mx-auto flex w-full max-w-[60ch] flex-col gap-5 py-6">
            <header>
                <h1 className="font-display text-title text-content">
                    {title}
                </h1>
                <p className="mt-2.5 text-body text-content-secondary">
                    {summary}
                </p>
            </header>

            <div className="rounded-lg border border-dashed border-strong bg-surface-sunken/60 px-5 py-6">
                <p className="text-body-sm text-content-secondary">
                    This page has not been written yet. PlayRates is not open to
                    the public, so there is nothing here that anyone is relying
                    on.
                </p>
                <p className="mt-3 text-body-sm text-content-secondary">
                    If you need to reach someone in the meantime, the account
                    that runs this site is the one to ask.
                </p>
            </div>

            <div>
                <Link to="/" className={buttonClass("secondary")}>
                    Back to home
                </Link>
            </div>
        </article>
    );
};

export default LegalPage;
