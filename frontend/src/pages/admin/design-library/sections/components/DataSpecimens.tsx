import {
    GAME_STATUSES,
    PLAYED_STATUSES,
} from "../../../../../constants/gameStatus";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import RatingBadge from "../../../../../components/ui/RatingBadge";
import Figure from "../../../../../components/ui/Figure";
import LedgerRow, { LedgerList } from "../../../../../components/ui/LedgerRow";
import GamePlatform from "../../../../../components/GamePlatform";
import ProfilePicture from "../../../../../components/ProfilePicture";
import UserStatus from "../../../../../components/UserStatus";
import FriendProfile from "../../../../../components/FriendProfile";
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

const demoUser = {
    id: "00000000-0000-0000-0000-000000000000",
    username: "ashgrove",
    avatarUrl: null,
    bio: "Local development account.",
    online: true,
};

const DataSpecimens = () => (
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
            <div className="flex flex-wrap gap-2 bg-surface-media p-4">
                {PLAYED_STATUSES.map((status) => (
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
            notes="Every number in the product is a ledger figure — tabular is set on body, not per component. The roll counts up over 320ms when a value changes, and simply swaps under reduced motion."
            meta='value · format · size="display" | "row" | "label" · roll'
        >
            <Figure value={184662} size="display" />
            <Figure value={1284} size="row" />
            <Figure value={412} size="label" />
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
                <LedgerRow label="Finished" value="11 Feb 2026" rule={false} />
            </LedgerList>
        </Specimen>

        <Specimen
            title="Platform badges"
            notes="Display names come from the /platforms query, so the badge never hard-codes a label."
            meta='platform (slug) · size="xs" | "base"'
        >
            {PLATFORM_SLUGS.map((slug) => (
                <GamePlatform key={slug} platform={slug} size="base" />
            ))}
        </Specimen>

        <Specimen
            title="Avatars and presence"
            notes="The presence dot is the only round thing in the system besides the mastered pill."
            meta="ProfilePicture variant · UserStatus size"
        >
            <ProfilePicture
                variant="profileHeader"
                file=""
                username="ashgrove"
                link={false}
            />
            <ProfilePicture
                variant="review"
                file=""
                username="ashgrove"
                link={false}
            />
            <ProfilePicture
                variant="friendRow"
                file=""
                username="ashgrove"
                link={false}
            />
            <UserStatus status="online" />
            <UserStatus status="offline" />
        </Specimen>

        <Specimen
            title="Friend row"
            notes="One row, two densities — the popup list and the profile rail use the same component."
            meta='user · density="compact" | "comfortable"'
        >
            <FriendProfile user={demoUser} density="comfortable" />
            <FriendProfile user={demoUser} density="compact" />
        </Specimen>
    </>
);

export default DataSpecimens;
