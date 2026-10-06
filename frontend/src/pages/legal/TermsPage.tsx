import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "@playrates/shared";
import ProsePage from "./ProsePage";

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

/* When the substance of this page changes, move the date. */
const UPDATED = "2026-10-06";

const TermsPage = () => (
    <ProsePage
        title="Terms of use"
        tabTitle="Terms"
        summary="The rules for having an account on PlayRates."
        updated={UPDATED}
    >
        <h2>The basics</h2>
        <p>
            These terms are an agreement between you and me, Callum Burgoyne,
            the person who runs PlayRates. By making an account you agree to
            them, and to the way your data is handled in the{" "}
            <Link to="/privacy">privacy policy</Link>. If you don’t agree,
            please don’t use the site.
        </p>
        <p>
            PlayRates is free and isn’t run as a business. It’s a place to track
            the games you play, with reviews and a community forum alongside.
        </p>

        <h2>Your account</h2>
        <ul>
            <li>You need to be 13 or older.</li>
            <li>
                One account per person. Don’t make accounts for other people,
                and don’t share yours.
            </li>
            <li>
                Your username shouldn’t pretend to be someone else or be
                offensive. I may change or remove one that is.
            </li>
            <li>
                Keep your password to yourself. You’re responsible for what
                happens on your account.
            </li>
        </ul>

        <h2>What you post</h2>
        <p>
            Your reviews, ratings, threads, messages, pictures and profile are
            yours. By posting them here you give me permission to store them and
            show them on PlayRates, including in search results and link
            previews, for as long as they’re on the site. Only post pictures you
            have the right to share.
        </p>
        <p>
            When you close your account, community posts stay up without your
            name on them. The privacy policy explains why, and how to remove
            them first if you want to.
        </p>

        <h2>House rules</h2>
        <p>Don’t use PlayRates to:</p>
        <ul>
            <li>
                post anything illegal, including sexual content involving anyone
                under 18, terrorist material or threats of violence
            </li>
            <li>harass, bully, threaten or stalk anyone</li>
            <li>
                attack people for who they are, such as their race, religion,
                sex, sexuality, gender identity or disability
            </li>
            <li>post pornography or other sexually explicit material</li>
            <li>share someone’s personal information without their consent</li>
            <li>pretend to be someone else</li>
            <li>spam, advertise, or link to scams or malware</li>
            <li>
                scrape the site, point bots at it, or try to get round its
                security or rate limits
            </li>
        </ul>
        <p>
            Spoilers aren’t against the rules, but please mark them. Reviews
            have a spoiler switch, and community posts have spoiler formatting.
        </p>

        <h2 id="reporting">Reporting and moderation</h2>
        <p>
            If you see something that breaks these rules, use the Report button
            on it. If you don’t have an account, email <Email /> with a link to
            it. Reports come to me, and the person you report isn’t told who
            sent it.
        </p>
        <p>
            I look at every report. If something breaks the rules or the law I
            remove it, and depending on how serious it is, I may also clear
            parts of a profile or close the account. Illegal content comes down
            as soon as I know about it, and I’ll pass it on to the police or the
            right authority where I have to.
        </p>
        <p>
            I’m the person responsible for keeping PlayRates safe under the UK’s
            Online Safety Act. Posts aren’t scanned automatically. Moderation is
            done by me, by hand.
        </p>
        <p>
            If I’ve removed something of yours or closed your account and you
            think I got it wrong, email me and say why. I’ll look at it again
            and tell you what I decide. The same address takes any other
            complaint about how the site deals with harmful content.
        </p>

        <h2>Game information</h2>
        <p>
            Game details and artwork come from IGDB. Game names, logos and art
            belong to their publishers and developers. PlayRates isn’t connected
            with or endorsed by any of them.
        </p>

        <h2>The code</h2>
        <p>
            PlayRates is open source under the GNU AGPL-3.0 licence. That
            licence covers the code only, not what people post here, which
            belongs to them.
        </p>

        <h2>No guarantees</h2>
        <p>
            I run PlayRates in my spare time. I’ll do my best to keep it up and
            keep your data safe, but the site is provided as it is, with no
            promise that it’ll always be available or free of mistakes. Please
            don’t make it the only place you keep something you’d hate to lose.
            You can export your data at any time.
        </p>
        <p>
            As far as the law allows, I’m not liable for indirect losses or lost
            data from using PlayRates. Nothing in these terms limits liability
            for death or personal injury caused by negligence, for fraud, or for
            anything else the law says can’t be limited.
        </p>

        <h2>Ending things</h2>
        <p>
            You can delete your account from{" "}
            <Link to="/settings">Settings</Link> whenever you like. I can
            suspend or close an account that breaks these terms. If I ever shut
            PlayRates down, I’ll try to give at least 30 days’ notice on the
            site so you can export your data first.
        </p>

        <h2>Changes to these terms</h2>
        <p>
            I may update these terms. If a change matters, I’ll say so on the
            site before it takes effect, and carrying on using PlayRates after
            that means you accept it.
        </p>

        <h2>The law that applies</h2>
        <p>
            These terms are governed by the law of England and Wales. If you
            live somewhere else, you keep any protections your local consumer
            law gives you, and you can bring a claim in your own local courts.
        </p>

        <h2>Questions</h2>
        <p>
            Anything about these terms: <Email />.
        </p>
    </ProsePage>
);

export default TermsPage;
