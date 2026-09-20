import {
    GAME_STATUSES,
    PLAYED_STATUSES,
} from "../../../../../constants/gameStatus";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import Rating from "../../../../../components/ui/Rating";
import Figure from "../../../../../components/ui/Figure";
import LedgerRow, {
    LedgerList,
} from "../../../../../components/ui/LedgerRow";
import GamePlatform from "../../../../../components/GamePlatform";
import ProfilePicture from "../../../../../components/ProfilePicture";
import UserStatus from "../../../../../components/UserStatus";
import FriendProfile from "../../../../../components/FriendProfile";
import Specimen from "../../../components/Specimen";

const PLATFORM_SLUGS = [
    "steam",
    "playstation",
    "xbox",
    "nintendo-switch",
    "pc-game-pass",
    "other-pc",
    "mobile",
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
            notes="Four hues for the top-level states, four shapes for the substatuses — pill, square, cut corner, plain — plus the word, always. Mastered is a pill because nothing else in the system is round; retired is the only plain outline. Turn this page greyscale and every badge still reads."
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
            notes="Four sizes, one system. The brand figure is reserved for real PlayRates ratings — an unrated thing shows a muted em dash rather than borrowing the colour."
            meta='size="display" | "row" | "inline" | "tile" · caption'
        >
            <Rating value={8.25} size="display" caption="Display" />
            <Rating value={8.25} size="row" caption="Row" />
            <Rating value={8.25} size="inline" caption="Inline" />
            <Rating value={8.25} size="tile" caption="Tile" />
            <Rating value={null} size="row" caption="Unrated" />
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
            notes="Label left, dotted rule, figure right. Beneath every plate, facts are set this way. The leader is decorative, so a screen reader reads 'Status, Mastered' rather than a run of dots."
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
