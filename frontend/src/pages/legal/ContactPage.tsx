import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@playrates/shared";
import { buttonClass } from "../../components/ui/Button";
import ProsePage from "./ProsePage";

const ContactPage = () => (
    <ProsePage title="Contact" summary="The quickest way to reach me.">
        <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface-raised p-5 shadow-plate sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
                <p className="font-display text-section text-content">
                    Send me an email
                </p>
                <p className="mt-1 text-body-sm text-content-secondary">
                    I read everything and reply as soon as I can.
                </p>
            </div>
            <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={buttonClass(
                    "primary",
                    "w-full no-underline sm:w-auto",
                    "lg"
                )}
            >
                <Mail size={17} aria-hidden />
                {CONTACT_EMAIL}
            </a>
        </div>

        <h2>Found a bug?</h2>
        <p>
            Tell me what you were doing and what went wrong. A screenshot helps
            a lot. If you’re happy using GitHub, you can{" "}
            <a
                href="https://github.com/CallumB04/playrates/issues"
                target="_blank"
                rel="noreferrer noopener"
            >
                open an issue
            </a>{" "}
            instead.
        </p>

        <h2>Your data</h2>
        <p>
            You can download a copy of your data or delete your account yourself
            from <Link to="/settings">Settings</Link>. If you’d rather I did
            either for you, or you have any other question about your data,
            email me from the address on your account so I can check it’s you.
            There’s more in the <Link to="/privacy">privacy policy</Link>.
        </p>

        <h2>Reporting something</h2>
        <p>
            If you have an account, use the Report button on the post, review or
            profile. If you don’t, or it’s about something else, email me a link
            to it and a line on what’s wrong. If someone is in immediate danger,
            contact the police first.
        </p>
    </ProsePage>
);

export default ContactPage;
