import { Fragment } from "react";
import { Link } from "react-router-dom";
import { isExternalHref, parseAnnouncementBody } from "@playrates/shared";

/* relative z-10 lifts a link above a row whose title link stretches over it,
   so the rest of the row still opens the announcement's own link. */
const LINK =
    "relative z-10 text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const AnnouncementBody = ({
    body,
    onNavigate,
}: {
    body: string;
    onNavigate?: () => void;
}) => (
    <>
        {parseAnnouncementBody(body).map((part, i) => (
            <Fragment key={i}>
                {!part.href ? (
                    part.text
                ) : isExternalHref(part.href) ? (
                    <a
                        href={part.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={onNavigate}
                        className={LINK}
                    >
                        {part.text}
                    </a>
                ) : (
                    <Link to={part.href} onClick={onNavigate} className={LINK}>
                        {part.text}
                    </Link>
                )}
            </Fragment>
        ))}
    </>
);

export default AnnouncementBody;
