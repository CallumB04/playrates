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
const UPDATED = "2026-11-06";

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
                If you sign in with Google or Discord instead, no password. That
                service tells me your email address and your account ID there.
                It also sends your name and profile picture, which Supabase
                keeps with your sign-in record, but PlayRates doesn’t use them:
                your username and picture are the ones you choose here.
            </li>
            <li>
                A username, and if you add them, a first name, a bio, a profile
                picture and a profile colour.
            </li>
            <li>
                If you add it, your date of birth. Your profile only ever shows
                the age it makes, to whoever you choose. The date itself stays
                with you.
            </li>
            <li>
                Your settings, like your time zone and whether adult games are
                shown to you. If you turn adult games on, that you confirmed
                you’re 18 or over, and when.
            </li>
            <li>
                Which emails you want. Account emails, like password resets,
                always send. The others, about friend requests, replies,
                reactions and loves, gifts and invites, wishlist release days,
                the weekly digest, streak and task reminders and news, you can
                turn on or off one by one in{" "}
                <Link to="/settings?section=emails">Settings</Link> or with the
                link at the bottom of any email. Reminders are off unless you
                turn them on, and news is off unless you ticked the box when you
                signed up.
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
            <li>
                If you turn on push notifications, the address your browser
                gives for them, the keys that encrypt them and which browser it
                is.
            </li>
            <li>
                If you import from Steam, the games you choose to add, with
                their hours and achievements from Steam. Your Steam profile and
                the rest of your library aren’t kept.
            </li>
        </ul>

        <h3>In the background</h3>
        <ul>
            <li>
                When you were last active, so your friends can see if you’re
                online, and your profile can show the day you were last on. It
                updates every couple of minutes while the site is open. You
                choose who sees the day, and hiding your online status in
                Settings hides both.
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
                fix it. For an error in your browser, it also notes which
                browser and which version of PlayRates it was.
            </li>
            <li>
                Your ratings are compared with other members’ to suggest people
                who rate games like you. Only profiles open to everyone take
                part, and only the match is shown, never the working.
            </li>
        </ul>
        <p>
            I don’t keep your IP address in the database, and I only have your
            date of birth if you add it.
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
                (legitimate interests). Active days, search records and Vercel’s
                visit counts, which only ever turn into totals on my admin
                dashboard.
            </li>
        </ul>
        <p>
            I don’t use your data for advertising or profiling, and no decisions
            about you are made automatically.
        </p>

        <h2>Who else handles it</h2>
        <p>
            Four companies help run PlayRates. They process data for me and only
            for that:
        </p>
        <ul>
            <li>
                <strong>Supabase</strong> hosts the database, sign-in and
                uploaded pictures. Your data is stored in Frankfurt, Germany.
            </li>
            <li>
                <strong>Vercel</strong> hosts the website and the API. It keeps
                short-lived request logs, which include IP addresses. Its Web
                Analytics and Speed Insights count page views and measure how
                fast pages load, without cookies and without keeping your IP
                address. Vercel is based in the US.
            </li>
            <li>
                <strong>Resend</strong> sends PlayRates’ emails. It gets your
                email address, your username and what’s in each email, keeps a
                list of who wants news emails, and tells PlayRates whether each
                email arrived. Resend is based in the US.
            </li>
            <li>
                <strong>Upstash</strong> keeps the counts behind rate limits,
                which stop anyone sending too many requests at once. A count is
                kept against your IP address for about a minute. Upstash is
                based in the US.
            </li>
        </ul>
        <p>
            A couple of others see a little about your visit without me passing
            anything on:
        </p>
        <ul>
            <li>
                <strong>Google</strong> and <strong>Discord</strong>, if you
                sign in with one of them. They know you signed in to PlayRates,
                under their own privacy policies.
            </li>
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
            <li>
                <strong>Cloudflare Turnstile</strong> checks the sign-up and
                sign-in forms aren’t being filled in by a bot. It runs in your
                browser, so Cloudflare sees your IP address and details about
                your browser, under its own privacy policy.
            </li>
            <li>
                <strong>Steam</strong>, if you import from it. My server sends
                Steam your profile ID to get your list of games and your
                achievements in them.
            </li>
            <li>
                Your browser’s <strong>push service</strong>, if you turn on
                push notifications: Google’s for Chrome, Apple’s for Safari,
                Mozilla’s for Firefox, Microsoft’s for Edge. It delivers them,
                but what’s in each one is encrypted so only your browser can
                read it.
            </li>
        </ul>
        <p>
            I don’t sell your data or share it with anyone else, unless the law
            makes me.
        </p>

        <h2>Data outside the UK</h2>
        <p>
            Supabase keeps your data in the EU, which UK law already treats as
            safe to send data to. Vercel, Resend and Upstash are in the US, and
            transfers to them are covered by the safeguards in their data
            processing agreements.
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
            Some things go sooner, whatever happens to your account. Error
            records are deleted after 90 days, the record of which emails went
            to you and whether they arrived after 30 days, and search records
            after two years. Push notification details go when you turn them
            off, or when your browser’s push service says the browser is gone.
        </p>
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
            PlayRates doesn’t set any cookies. Your browser keeps these in its
            local storage:
        </p>
        <ul>
            <li>
                <code>playrates-theme</code>, whether you chose light or dark.
            </li>
            <li>
                <code>sb-…-auth-token</code>, your sign-in session, so you stay
                logged in.
            </li>
            <li>
                <code>playrates-draft:thread</code>, a community thread you
                started writing, until you post it or clear it.
            </li>
            <li>
                <code>playrates:last-system</code>, the console you last logged
                a game on, to offer it first next time.
            </li>
            <li>
                <code>pr_ref</code>, the username on an invite link you
                followed, for up to 30 days, so they get the credit if you join.
            </li>
        </ul>
        <p>
            Two more are kept only until you close the tab:{" "}
            <code>pr_invite_banner_closed</code>, when you close the invite
            banner, and <code>playrates:reloaded-for-new-build</code>, so a page
            that reloads for a new version of the site doesn’t do it twice. A
            small background script, the service worker, also keeps a copy of
            the page you see when you’re offline.
        </p>
        <p>
            All of them are there for things you asked for or that the site
            needs to work, so there’s no cookie banner. Vercel’s analytics
            script counts visits without cookies or anything stored in your
            browser. There are no advertising scripts.
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
