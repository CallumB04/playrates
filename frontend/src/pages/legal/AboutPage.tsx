import { Link } from "react-router-dom";
import { BRAND_PITCH } from "../../constants/brand";
import ProsePage from "./ProsePage";

const REPO = "https://github.com/CallumB04/playrates";

const AboutPage = () => (
    <ProsePage
        title="About PlayRates"
        tabTitle="About"
        summary="What PlayRates is and who runs it."
    >
        <h2>What it is</h2>
        <p>
            {BRAND_PITCH.map((part) =>
                part.to ? (
                    <Link key={part.text} to={part.to}>
                        {part.text}
                    </Link>
                ) : (
                    part.text
                )
            )}
        </p>
        <p>
            It’s free. There are no ads, and nothing you log here is sold or
            handed to anyone.
        </p>

        {/* TODO(Callum): replace this block with the story of why you built
            PlayRates, in your own words. */}
        <h2>Why I built it</h2>
        <div className="rounded-lg border border-dashed border-strong bg-surface-sunken/60 px-5 py-4 text-body-sm">
            Still being written. Check back soon.
        </div>

        <h2>Who runs it</h2>
        <p>
            PlayRates is built and run by me, Callum Burgoyne. It’s a one-person
            project, so if something’s broken or you’ve got an idea, you’ll be
            talking to the person who wrote the code. The{" "}
            <Link to="/contact">contact page</Link> has the details.
        </p>

        <h2>Open source</h2>
        <p>
            The code is on{" "}
            <a href={REPO} target="_blank" rel="noreferrer noopener">
                GitHub
            </a>{" "}
            under the AGPL-3.0 licence. You’re welcome to read it, report bugs
            there or run your own copy, as long as you share your changes under
            the same licence.
        </p>

        <h2>Where the game data comes from</h2>
        <p>
            Game details and cover art come from{" "}
            <a href="https://rawg.io" target="_blank" rel="noreferrer noopener">
                RAWG
            </a>
            , with some descriptions and box art from Steam. If a game’s details
            look wrong, that’s usually where the mistake started, but tell me
            anyway and I’ll see what I can do. The ratings, reviews and logs are
            all written by people using PlayRates.
        </p>
    </ProsePage>
);

export default AboutPage;
