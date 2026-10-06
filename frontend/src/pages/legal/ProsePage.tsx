import type { ReactNode } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatDate } from "../../lib/format";

interface ProsePageProps {
    title: string;
    /** For a heading that already names the site, so the tab doesn't say it
     *  twice. Defaults to the heading. */
    tabTitle?: string;
    /** One line under the heading, and the page's search description. */
    summary: string;
    /** YYYY-MM-DD. Policies say when they last changed; the rest need not. */
    updated?: string;
    children: ReactNode;
}

/** The about, contact and legal pages: one column set for reading. */
const ProsePage = ({
    title,
    tabTitle,
    summary,
    updated,
    children,
}: ProsePageProps) => {
    usePageMeta({ title: tabTitle ?? title, description: summary });

    return (
        <article className="mx-auto w-full max-w-[68ch] py-6 sm:py-10">
            <header className="border-b border-subtle pb-6">
                <h1 className="font-display text-title text-content">
                    {title}
                </h1>
                <p className="mt-3 text-body text-content-secondary">
                    {summary}
                </p>
                {updated && (
                    <p className="mt-4 text-label text-content-muted">
                        Last updated{" "}
                        <time dateTime={updated}>{formatDate(updated)}</time>
                    </p>
                )}
            </header>

            <div className="prose-page pt-6">{children}</div>
        </article>
    );
};

export default ProsePage;
