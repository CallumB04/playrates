import type { FriendUser } from "@playrates/shared";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
} from "../../../../../constants/gameStatus";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import RatingBadge from "../../../../../components/ui/RatingBadge";
import LedgerRow, { LedgerList } from "../../../../../components/ui/LedgerRow";
import PresenceDot from "../../../../../components/ui/PresenceDot";
import Figure from "../../../../../components/ui/Figure";
import Stat from "../../../../../components/ui/Stat";
import UserStatus from "../../../../../components/UserStatus";
import GamePlatform from "../../../../../components/GamePlatform";
import PlatformMarks from "../../../../../components/game/PlatformMarks";
import AchievementRing from "../../../../../components/gamelog/AchievementRing";
import ProfilePicture from "../../../../../components/ProfilePicture";
import FriendProfile from "../../../../../components/FriendProfile";
import { usePlatforms } from "../../../../../hooks/queries/useGames";
import { Clock, Hourglass, Trophy } from "lucide-react";
import { useState } from "react";
import Specimen from "../../../components/Specimen";

/** Every family, so a new one with no mark of its own shows up here first. */
const PLATFORM_SLUGS = [
    "steam",
    "pc-game-pass",
    "other-pc",
    "playstation",
    "xbox",
    "nintendo-switch",
    "nintendo",
    "mobile",
    "mac",
    "linux",
    "web",
    "sega",
    "atari",
    "commodore-amiga",
    "neo-geo",
    "3do",
];

const demoUser: FriendUser = {
    id: "00000000-0000-0000-0000-000000000000",
    username: "ashgrove",
    avatarUrl: null,
    accent: "violet",
    bio: "Local development account.",
    online: true,
};

const DataSpecimens = () => {
    const { data: platforms } = usePlatforms();
    const [count, setCount] = useState(184662);

    return (
        <>
            <Specimen
                title="Status badges"
                stack
                notes="Four hues for the top-level states, a distinct mark for each of the eight, and the word, always. Shape used to carry this channel, back when everything else was square; with generous radii it stopped differentiating, so the mark carries it alone. Turn this page greyscale and every badge still reads."
                meta="status · size='stamp' | 'base' · onMedia · animateOnChange"
            >
                <div className="flex flex-wrap gap-2">
                    {GAME_STATUSES.map((status) => (
                        <StatusBadge key={status} status={status} />
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    {PLAYED_STATUSES.map((status) => (
                        <StatusBadge key={status} status={status} />
                    ))}
                </div>
                {/* All eight over media, not just the substatuses: played kept a
                white word and mark under a purple border, and this row was
                where that should have been obvious. */}
                <div className="flex flex-wrap gap-2 bg-surface-media p-4">
                    {[...GAME_STATUSES, ...PLAYED_STATUSES].map((status) => (
                        <StatusBadge
                            key={status}
                            status={status}
                            size="stamp"
                            onMedia
                        />
                    ))}
                </div>
            </Specimen>

            <Specimen
                title="Rating"
                notes="The figure carries its own scale, so no meter is needed beside it. Brand ink is reserved for real PlayRates ratings; an unrated thing stays muted."
                meta='value · size="sm" | "md" | "lg"'
            >
                <RatingBadge value={8.25} size="lg" />
                <RatingBadge value={8.25} size="md" />
                <RatingBadge value={8.25} />
                <RatingBadge value={null} />
            </Specimen>

            <Specimen
                title="Figures"
                notes="Every number in the product is a ledger figure, set tabular. roll counts up over 320ms when the value changes and simply swaps under reduced motion — for a figure someone is watching change, like a library count ticking up during an import. figureClass gives the same type to a value that isn't a plain number."
                meta='value · format · size="display" | "lg" | "row" | "label" · roll — figureClass(size, className)'
            >
                <Figure value={count} size="display" roll />
                <Figure value={1284} size="lg" />
                <Figure value={1284} size="row" />
                <Figure value={412} size="label" />
                <button
                    type="button"
                    onClick={() => setCount((n) => n + 1318)}
                    className="text-label text-brand underline-offset-2 hover:underline"
                >
                    Roll it
                </button>
            </Specimen>

            <Specimen
                title="Stat"
                notes="A figure with its label under it — the game page's score cards, a profile's counts, your year on the home page all use this one. The optional mark above tells a row of them apart. While a figure is loading it holds its place: a figure nobody has fetched yet is not zero, and not an em dash either."
                meta="label · value (string or node) · icon · loading"
            >
                <div className="grid w-full max-w-md grid-cols-3 gap-4">
                    <Stat icon={Clock} value="31h" label="Average played" />
                    <Stat
                        icon={Hourglass}
                        value="48h"
                        label="Average to beat"
                    />
                    <Stat
                        icon={Trophy}
                        value="62%"
                        label="Average completion"
                    />
                </div>
                <div className="grid w-full max-w-md grid-cols-3 gap-4">
                    <Stat
                        value={<RatingBadge value={8.25} size="md" />}
                        label="Average rating"
                    />
                    <Stat value="12" label="Reviews" />
                    <Stat value="" label="Friends" loading />
                </div>
            </Specimen>

            <Specimen
                title="Ledger rows"
                stack
                notes="Label left, figure right, hairline between rows. The spacer is decorative, so a screen reader reads 'Status, Mastered' and nothing else."
                meta="LedgerList + LedgerRow — label · value · rule · size"
            >
                <LedgerList className="w-full max-w-sm">
                    <LedgerRow label="Status" value="Mastered" />
                    <LedgerRow label="Hours" value="52.5h" />
                    <LedgerRow label="Achievements" value="46/52" />
                    <LedgerRow
                        label="Finished"
                        value="11 Feb 2026"
                        rule={false}
                    />
                </LedgerList>
            </Specimen>

            <Specimen
                title="Platform badge"
                notes="A platform named in full, with its mark — for where a platform is the subject rather than a detail of a game: which platforms someone plays on, or a platform picked as a filter. Names come from the /platforms query."
                meta='platform (slug) · size="xs" | "base"'
            >
                {["steam", "playstation", "xbox", "nintendo-switch"].map(
                    (slug) => (
                        <GamePlatform key={slug} platform={slug} size="base" />
                    )
                )}
                <GamePlatform platform="mobile" size="xs" />
            </Specimen>

            <Specimen
                title="Platform marks"
                stack
                notes="The line under every cover. Names come from the /platforms query, so no mark hard-codes a label; past max the rest fold into a +n, which is how a tile stays one line long."
                meta="slugs · platforms · max · className"
            >
                <PlatformMarks
                    slugs={PLATFORM_SLUGS}
                    platforms={platforms ?? []}
                />
                <PlatformMarks
                    slugs={PLATFORM_SLUGS}
                    platforms={platforms ?? []}
                    max={3}
                />
            </Specimen>

            <Specimen
                title="Avatars and presence"
                notes="The generated avatar takes the profile's colour, so the same person looks the same everywhere. The presence dot sits on the rim of the circle at every size rather than floating off its corner; it expects a relative wrapper."
                meta="ProfilePicture variant · accent · PresenceDot online · size"
            >
                <span className="relative inline-block">
                    <ProfilePicture
                        variant="profileHeader"
                        file=""
                        username="ashgrove"
                        accent="violet"
                        link={false}
                    />
                    <PresenceDot online size="lg" />
                </span>
                <span className="relative inline-block">
                    <ProfilePicture
                        variant="review"
                        file=""
                        username="marlowe"
                        accent="amber"
                        link={false}
                    />
                    <PresenceDot online={false} size="lg" />
                </span>
                <span className="relative inline-block">
                    <ProfilePicture
                        variant="friendRow"
                        file=""
                        username="tessellate"
                        accent="teal"
                        link={false}
                    />
                    <PresenceDot online />
                </span>
                <span className="relative inline-block">
                    <ProfilePicture
                        variant="nav"
                        file=""
                        username="quietriver"
                        link={false}
                    />
                    <PresenceDot online={false} />
                </span>
            </Specimen>

            <Specimen
                title="User status"
                notes="Presence said in words, for where there is room — the profile header. Offline is muted rather than red: being away is not an error, and it matches the dot on the same person's avatar."
                meta='online · size="sm" | "md"'
            >
                <UserStatus online />
                <UserStatus online={false} />
                <UserStatus online size="sm" />
            </Specimen>

            <Specimen
                title="Friend row"
                notes="One row, two densities — the popup list and the profile rail use the same component."
                meta='user · density="compact" | "comfortable"'
            >
                <FriendProfile user={demoUser} density="comfortable" />
                <FriendProfile user={demoUser} density="compact" />
            </Specimen>

            <Specimen
                title="Achievement ring"
                notes="Gold, because completion is the one figure a log earns rather than records. It sits beside the log's facts, not in them."
                meta="done · total · size"
            >
                <AchievementRing done={46} total={52} />
                <AchievementRing done={52} total={52} />
                <AchievementRing done={3} total={52} size={48} />
            </Specimen>
        </>
    );
};

export default DataSpecimens;
