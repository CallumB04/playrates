import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "@playrates/shared";
import ProsePage from "./ProsePage";

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const ContactPage = () => (
    <ProsePage title="Contact" summary="The quickest way to reach me.">
        <p>
            Email <Email />. I read everything that comes in, though it might
            take me a few days to reply.
        </p>

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

        <h2>Anything else</h2>
        <p>Ideas, questions, or just saying hello: same address.</p>
    </ProsePage>
);

export default ContactPage;
