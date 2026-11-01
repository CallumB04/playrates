import type { ReactNode } from "react";
import { SITE_ORIGIN } from "@playrates/shared";
import { linkify } from "../../lib/linkify";

/** Addresses written out in the text, made into links. Only http(s) and
 *  mailto ever come out of linkify, so nothing here can run script. */
export const withLinks = (text: string): ReactNode =>
    linkify(text).map((part, i) =>
        typeof part === "string" ? (
            part
        ) : part.href.startsWith(SITE_ORIGIN) ||
          part.href.startsWith("mailto:") ? (
            <a key={i} href={part.href}>
                {part.text}
            </a>
        ) : (
            <a
                key={i}
                href={part.href}
                target="_blank"
                rel="noreferrer noopener"
            >
                {part.text}
            </a>
        )
    );
