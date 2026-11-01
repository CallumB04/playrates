import type { InputHTMLAttributes } from "react";

/** The ask for news emails, unticked: news is something a member asks for,
 *  and UK rules want the chance to say no where the address is given. On
 *  the sign-up form, and on the username popup a Google or Discord sign-up
 *  goes through instead. */
const NewsOptIn = (
    props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">
) => (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-body-sm text-content-secondary">
        <input
            type="checkbox"
            className="mt-0.5 size-4.5 shrink-0 accent-brand"
            {...props}
        />
        <span>
            Email me news about PlayRates now and then. You can stop any time.
        </span>
    </label>
);

export default NewsOptIn;
