import { useState } from "react";
import Panel, { PanelCount } from "../../../../../components/ui/Panel";
import Plate from "../../../../../components/ui/Plate";
import Card, { CardHeader } from "../../../../../components/ui/Card";
import { popoverClass } from "../../../../../components/ui/popover";
import Modal from "../../../../../components/ui/Modal";
import ConfirmPopup from "../../../../../components/ui/ConfirmPopup";
import Button from "../../../../../components/ui/Button";
import LedgerRow, { LedgerList } from "../../../../../components/ui/LedgerRow";
import GameCover from "../../../../../components/game/GameCover";
import GameTile, {
    type TileAction,
} from "../../../../../components/game/GameTile";
import { STATUS_PRESENTATION } from "../../../../../constants/gameStatus";
import { useGames, usePlatforms } from "../../../../../hooks/queries/useGames";
import Specimen from "../../../components/Specimen";

const noop = () => {};

/* What each tile offers, in the order a shelf does: a game you have not
   logged, then one you have. */
const UNLOGGED: TileAction[] = [
    { key: "log", label: "Create log", tone: "primary", onSelect: noop },
    {
        key: "backlog",
        label: "Add to backlog",
        icon: STATUS_PRESENTATION.backlog.icon,
        onSelect: noop,
    },
    {
        key: "wishlist",
        label: "Add to wishlist",
        icon: STATUS_PRESENTATION.wishlist.icon,
        onSelect: noop,
    },
];
const LOGGED: TileAction[] = [
    { key: "view", label: "View your log", tone: "primary", onSelect: noop },
    { key: "edit", label: "Edit", onSelect: noop },
];

const SurfaceSpecimens = () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    // Real box art, so the tile is judged against what a shelf shows.
    const { data: games } = useGames({ trending: true, limit: 2 });
    const { data: platforms } = usePlatforms();
    const [first, second] = games?.data ?? [];

    return (
        <>
            <Specimen
                title="Plates"
                notes="The system's elevation, as surfaces. Raised is lit from above; deep has risen further, for the one thing on a page that should float highest. Flat keeps the edge without the shadow, for tiles sitting in a row — the game page's score cards. Pressed is a well set into the surface around it: the current game on the home page, a log's headline figures."
                meta='plateClass(state, depth, className) — state="raised" | "flat" | "pressed" · depth="shallow" | "deep"'
            >
                {(
                    [
                        ["raised", "deep"],
                        ["raised", "shallow"],
                        ["flat", "shallow"],
                        ["pressed", "shallow"],
                    ] as const
                ).map(([state, depth]) => (
                    <div key={`${state}-${depth}`} className="text-center">
                        <Plate
                            state={state}
                            depth={depth}
                            className="size-24"
                        />
                        <p className="mt-2 text-label-sm text-content-muted">
                            {state}
                            {depth === "deep" && " deep"}
                        </p>
                    </div>
                ))}
            </Specimen>

            <Specimen
                title="Card"
                notes="The page's basic surface. Padding is named rather than overridden, since classes are joined without merging and a p-0 beside the default p-4 would leave both: none is for a card whose content sets its own, like a header strip or a banner. The tone marks a card that wants something (accent) or holds something that can't be undone (danger)."
                meta='padding="default" | "none" · tone="default" | "accent" | "danger" — cardClass(className, { padding, tone }) · CardHeader'
            >
                <Card className="w-full max-w-xs">
                    <CardHeader>Your 2026</CardHeader>
                    <p className="mt-1 font-display text-section text-content">
                        Lanternfall
                    </p>
                    <LedgerList className="mt-2">
                        <LedgerRow label="Hours" value="52.5h" />
                        <LedgerRow
                            label="Achievements"
                            value="46/52"
                            rule={false}
                        />
                    </LedgerList>
                </Card>
                <Card tone="danger" className="w-full max-w-xs">
                    <CardHeader>Close account</CardHeader>
                    <p className="mt-2 text-body-sm text-content-secondary">
                        Your logs and everything attached to them go with it.
                    </p>
                </Card>
            </Specimen>

            <Specimen
                title="Popover"
                notes="The surface of anything floating over the page: the account menu, the inbox, a dropdown's options, the search results, the played breakdown on the game page. Position and size stay with each caller, since every one hangs off something different; what they share is how high they sit and how they arrive."
                meta='popoverClass(className, shape) — shape="menu" | "list"'
            >
                <div className={popoverClass("w-56 p-1.5", "menu")}>
                    <p className="px-2.5 py-2 text-body-sm text-content-secondary">
                        menu — hangs off the header
                    </p>
                </div>
                <div className={popoverClass("w-52 p-1")}>
                    <p className="px-2.5 py-2 text-body-sm text-content-secondary">
                        list — options, a note
                    </p>
                </div>
            </Specimen>

            <Specimen
                title="Panel"
                notes="A card with a header strip carrying its title, and a trailing slot for a count or a control. Built on the card surface, so the two can't drift apart. accent tints the strip, for a panel that wants something from you."
                meta="title · trailing · accent · bodyClassName — PanelCount"
            >
                <Panel
                    title="Lanternfall"
                    trailing={<PanelCount value="52.5h" />}
                    className="w-full max-w-xs"
                >
                    <LedgerList>
                        <LedgerRow label="Status" value="Mastered" />
                        <LedgerRow label="Hours" value="52.5h" />
                        <LedgerRow
                            label="Achievements"
                            value="46/52"
                            rule={false}
                        />
                    </LedgerList>
                </Panel>
                <Panel
                    title="Accent"
                    trailing={<PanelCount value="2" accent />}
                    accent
                    className="w-full max-w-xs"
                >
                    <p className="text-body-sm text-content-secondary">
                        The same panel, asking for something.
                    </p>
                </Panel>
            </Specimen>

            <Specimen
                title="Game tile"
                notes="The shelf's unit: box art, one line of platform marks and a figure under it, and the actions over the cover on hover. A touch screen cannot hover, so below sm the first action gets a standing button of its own. A logged game is stamped with its status, and its first action opens the log rather than overwriting it."
                meta="gameId · title · coverUrl · platformSlugs · platforms · rating · footValue · status · meta · actions · narrowFoot"
            >
                <div className="grid w-full max-w-lg grid-cols-3 gap-4">
                    {first && (
                        <GameTile
                            gameId={first.id}
                            title={first.title}
                            coverUrl={first.coverUrl}
                            platformSlugs={first.platforms}
                            platforms={platforms ?? []}
                            footValue={first.releaseDate?.slice(0, 4)}
                            actions={UNLOGGED}
                        />
                    )}
                    {second && (
                        <GameTile
                            gameId={second.id}
                            title={second.title}
                            coverUrl={second.coverUrl}
                            platformSlugs={second.platforms}
                            platforms={platforms ?? []}
                            rating={8.5}
                            status="mastered"
                            meta="Your log · 8.5 · 52h"
                            actions={LOGGED}
                        />
                    )}
                    <GameTile
                        gameId={0}
                        title="A game with no cover"
                        coverUrl={null}
                        footValue="2026"
                        actions={UNLOGGED}
                    />
                </div>
            </Specimen>

            <Specimen
                title="Game cover"
                notes="Box art is the only saturated thing on a page, so it gets the depth and the chrome stays quiet. The placeholder is a filled well rather than a broken image — an empty src would re-request the document. In a flex row give it self-start, or the row stretches it past its aspect ratio."
                meta="coverUrl · title · className"
            >
                <GameCover
                    coverUrl={first?.coverUrl ?? null}
                    title={first?.title ?? "Cover"}
                    className="aspect-3/4 w-28 shadow-cover"
                />
                <GameCover
                    coverUrl={null}
                    title="No cover"
                    className="aspect-3/4 w-28 shadow-cover"
                />
            </Specimen>

            <Specimen
                title="Modal"
                notes="A bottom sheet below sm, the centred dialog from there up. Lifts in on a spring over a blurred scrim, with the deepest shadow in the system. Escape and a backdrop mousedown both close; focus moves in and is restored on the way out."
                meta="onClose · labelledBy · showCloseButton · className"
            >
                <Button onClick={() => setModalOpen(true)}>Open modal</Button>
                {modalOpen && (
                    <Modal
                        onClose={() => setModalOpen(false)}
                        labelledBy="demo-modal-title"
                        className="w-full sm:max-w-[440px]"
                    >
                        <h2
                            id="demo-modal-title"
                            className="pr-11 font-display text-section text-content sm:pr-8"
                        >
                            Lanternfall
                        </h2>
                        <p className="py-4 text-body-sm text-content-secondary">
                            Any content goes in a modal. For a question with a
                            yes and a no, reach for the confirm popup instead.
                        </p>
                        <Button
                            onClick={() => setModalOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Done
                        </Button>
                    </Modal>
                )}
            </Specimen>

            <Specimen
                title="Confirm popup"
                notes="One question, two answers, and a body that names the thing being acted on. The danger tone is for what cannot be undone. The confirm button carries the pending state, so a slow request can't be sent twice."
                meta='title · body · confirmLabel · tone="danger" | "neutral" · isPending · onConfirm · onClose'
            >
                <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                    Delete log
                </Button>
                {confirmOpen && (
                    <ConfirmPopup
                        title="Delete this log?"
                        body="Lanternfall comes off your shelf, along with its 52 hours and your review. The game stays in the catalogue."
                        confirmLabel="Delete log"
                        tone="danger"
                        onConfirm={() => setConfirmOpen(false)}
                        onClose={() => setConfirmOpen(false)}
                    />
                )}
            </Specimen>
        </>
    );
};

export default SurfaceSpecimens;
