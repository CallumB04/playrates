import type { ReactNode } from "react";
import { usePageTitle } from "../../../hooks/usePageTitle";

/** What the view is for, in a sentence, with its controls beside it. The
 *  tabs above already name it, so the name only goes to the tab and to
 *  assistive tech. */
const AdminPageHeader = ({
    title,
    description,
    actions,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) => {
    usePageTitle(`${title} · Admin`);
    return (
        <div className="mb-5 flex flex-col gap-4 empty:hidden sm:flex-row sm:items-end sm:justify-between">
            <h2 className="sr-only">{title}</h2>
            {description && (
                <p className="max-w-[60ch] text-body text-content-secondary">{description}</p>
            )}
            {actions && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>}
        </div>
    );
};

export default AdminPageHeader;
