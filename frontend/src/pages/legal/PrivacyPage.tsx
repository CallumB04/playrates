import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "@playrates/shared";
import ProsePage from "./ProsePage";

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const External = ({ href, children }: { href: string; children: string }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
    </a>
);

/* When the substance of this page changes, move the date. */
const UPDATED = "2026-10-06";

const PrivacyPage = () => (
    <ProsePage
        title="Privacy policy"
        tabTitle="Privacy"
        summary="What PlayRates keeps about you and why."
        updated={UPDATED}
    >
        <h2>The short version</h2>
        <p>
            PlayRates stores what you give it: your email address, your profile
            and the games you log. It uses that to run the site and for nothing
            else. There are no ads or tracking cookies, and nothing is sold. You
            can download everything or delete your account from{" "}
            <Link to="/settings">Settings</Link> whenever you like.
        </p>

        <h2>Who I am</h2>
        <p>
            PlayRates is run by me, Callum Burgoyne, as an individual in the UK.
            I’m the data controller for this site, which is the legal way of
            saying I decide what happens to your information and I’m the one
            responsible for it. You can reach me at <Email />.
        </p>

        <h2>What I store</h2>
        <h3>When you make an account</h3>
        <ul>
            <li>
                Your email address and a password. The password is stored as a
                hash by Supabase, so I never see it.
            </li>
            <li>
                A username, and if you add them, a first name, a bio, a profile
                picture and a profile colour.
            </li>
            <li>
                Your settings, like your time zone and whether adult games are
                shown to you.
            </li>
        </ul>

        <h3>When you use the site</h3>
        <ul>
            <li>
                The games you log, with their status, rating, hours and dates.
            </li>
            <li>
                Reviews you write, and the reviews and messages you vote on.
            </li>
            <li>
                Your friends and friend requests, and the notifications they
                create.
            </li>
            <li>
                Threads and messages you post in the community, and any pictures
                you upload with them.
            </li>
            <li>Reports you send about other people’s posts.</li>
        </ul>

        <h3>In the background</h3>
        <ul>
            <li>
                When you were last active, so your friends can see if you’re
                online. It updates every couple of minutes while the site is
                open. You can hide your online status in Settings.
            </li>
            <li>
                Which days you used the site. I use this to count active users.
            </li>
            <li>
                An activity log of things like new logs, reviews and posts,
                which I use to keep an eye on the site. It includes your
                username and short excerpts of what you post.
            </li>
            <li>
                Searches that had to look beyond the PlayRates catalogue, along
                with your account ID, so I can see what brings new games in.
            </li>
            <li>
                If something breaks while you’re using the site, a record of the
                error with your account ID and the page you were on, so I can
                fix it.
            </li>
        </ul>
        <p>
            I don’t keep your IP address in the database, and I don’t ask for
            your date of birth.
        </p>

        <h2>Why, and the legal part</h2>
        <p>
            Data protection law asks me to name a lawful basis for everything I
            do with your data. In plain terms:
        </p>
        <ul>
            <li>
                <strong>Running your account</strong> (contract). Storing your
                profile, logs, reviews, posts and friends is the service you
                signed up for.
            </li>
            <li>
                <strong>Keeping the site working and safe</strong> (legitimate
                interests). Error records, the activity log, rate limits and
                handling reports. I need these to fix problems and deal with
                abuse.
            </li>
            <li>
                <strong>Knowing roughly how the site is used</strong>{" "}
                (legitimate interests). Active days and search records, which
                only ever turn into totals on my admin dashboard.
            </li>
        </ul>
        <p>
            I don’t use your data for advertising or profiling, and no decisions
            about you are made automatically.
        </p>

        <h2>Who else handles it</h2>
        <p>
            Two companies help run PlayRates. They process data for me and only
            for that:
        </p>
        <ul>
            <li>
                <strong>Supabase</strong> hosts the database, sign-in and
                uploaded pictures. Your data is stored in Frankfurt, Germany.
            </li>
            <li>
                <strong>Vercel</strong> hosts the website and the API. It keeps
                short-lived request logs, which include IP addresses. Vercel is
                based in the US.
            </li>
        </ul>
        <p>
            A couple of others see a little about your visit without me passing
            anything on:
        </p>
        <ul>
            <li>
                <strong>IGDB</strong>, which Twitch runs, supplies game details.
                When a search needs to look beyond the PlayRates catalogue, my
                server sends IGDB the search words, with nothing that identifies
                you.
            </li>
            <li>
                Covers and artwork load straight from <strong>IGDB</strong>’s
                image servers, so your browser connects to them and they see
                your IP address, the same as any site that shows their images.
            </li>
        </ul>
        <p>
            I don’t sell your data or share it with anyone else, unless the law
            makes me.
        </p>

        <h2>Data outside the UK</h2>
        <p>
            Supabase keeps your data in the EU, which UK law already treats as
            safe to send data to. Vercel is in the US, and transfers to it are
            covered by the safeguards in Vercel’s data processing agreement.
        </p>

        <h2>How long I keep it</h2>
        <p>
            Everything tied to your account stays until you delete the account.
            When you do:
        </p>
        <ul>
            <li>
                Your profile, picture, logs, reviews, votes, friendships and
                notifications are deleted straight away.
            </li>
            <li>
                Your entries in the activity log are deleted, and your search
                and error records stop being linked to you.
            </li>
            <li>
                Community threads and messages you posted stay up, so the
                conversations around them still make sense, but your name comes
                off them and they show as from a deleted account. If you want
                them gone as well, delete them before you close your account, or
                email me.
            </li>
            <li>
                Reports you sent stay, without your name on them, so I still
                know what was reported.
            </li>
        </ul>
        <p>
            Vercel’s request logs and Supabase’s sign-in logs are kept for a
            short time by them and then deleted automatically.
        </p>

        <h2>Your rights</h2>
        <ul>
            <li>
                <strong>Get a copy</strong> of your data with Export my data in
                Settings. It downloads as a JSON file.
            </li>
            <li>
                <strong>Correct it</strong>. You can change most of it yourself
                in Settings or on your profile. For anything you can’t, email
                me.
            </li>
            <li>
                <strong>Delete it</strong> with Delete account in Settings. It’s
                immediate and can’t be undone.
            </li>
            <li>
                <strong>Object</strong> to, or ask me to limit, anything I do on
                the basis of legitimate interests.
            </li>
        </ul>
        <p>
            For any of these, email <Email />. I’ll reply within a month, which
            is the legal limit, and usually much sooner. I may ask you to write
            from the address on your account so I know it’s you.
        </p>
        <p>
            If you’re unhappy with how I’ve handled your data, you can complain
            to the{" "}
            <External href="https://ico.org.uk/make-a-complaint/">
                Information Commissioner’s Office
            </External>
            . If you live in the EU, you can go to your local data protection
            authority instead. I’d like the chance to put it right first,
            though.
        </p>

        <h2>Cookies and local storage</h2>
        <p>
            PlayRates doesn’t set any cookies. Your browser keeps two things in
            its local storage:
        </p>
        <ul>
            <li>
                <code>playrates-theme</code>, whether you chose light or dark.
            </li>
            <li>
                <code>sb-…-auth-token</code>, your sign-in session, so you stay
                logged in.
            </li>
        </ul>
        <p>
            Both are there because you asked for what they do, so there’s no
            cookie banner. There are no analytics or advertising scripts.
        </p>

        <h2>Children</h2>
        <p>
            You need to be 13 or older to make an account. If you think someone
            under 13 has signed up, email me and I’ll delete the account.
        </p>

        <h2>Changes to this policy</h2>
        <p>
            If I change this policy in a way that matters, I’ll say so on the
            site before it takes effect. The date at the top shows when it last
            changed.
        </p>
    </ProsePage>
);

export default PrivacyPage;
