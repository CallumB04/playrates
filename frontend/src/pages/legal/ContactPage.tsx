import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@playrates/shared";
import { buttonClass } from "../../components/ui/Button";
import { DISCORD_INVITE_URL } from "../../constants/brand";
import ProsePage from "./ProsePage";

const ContactPage = () => (
    <ProsePage title="Contact" summary="How to get in touch.">
        <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface-raised p-5 shadow-plate sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
                <p className="font-display text-section text-content">
                    Send me an email
                </p>
                <p className="mt-1 text-body-sm text-content-secondary">
                    I reply to every email.
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
            a lot. You can also post it in #help-and-bugs on the{" "}
            <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noreferrer noopener"
            >
                PlayRates Discord
            </a>
            , where other players can say if they’ve hit it too, or{" "}
            <a
                href="https://github.com/CallumB04/playrates/issues"
                target="_blank"
                rel="noreferrer noopener"
            >
                open an issue
            </a>{" "}
            on GitHub.
        </p>

        <h2>Got an idea?</h2>
        <p>
            Post it in #feature-reqs on the{" "}
            <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noreferrer noopener"
            >
                Discord
            </a>
            , where other players can vote for it, or email me.
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
