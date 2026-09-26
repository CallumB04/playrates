import type { ReactNode } from "react";
import { usePageTitle } from "../../../hooks/usePageTitle";

/** Every admin view opens the same way: what it is, and its controls. */
const AdminPageHeader = ({
    title,
    description,
    actions,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) => {
    usePageTitle(`Admin · ${title}`);
    return (
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h2 className="text-title font-semibold text-content">{title}</h2>
                {description && (
                    <p className="mt-1 text-body-sm text-content-secondary">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
    );
};

export default AdminPageHeader;
