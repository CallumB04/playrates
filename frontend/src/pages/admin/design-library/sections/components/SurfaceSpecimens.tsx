import { useState } from "react";
import Plate from "../../../../../components/ui/Plate";
import Card, { CardHeader } from "../../../../../components/ui/Card";
import Modal from "../../../../../components/ui/Modal";
import Button from "../../../../../components/ui/Button";
import LedgerRow, {
    LedgerList,
} from "../../../../../components/ui/LedgerRow";
import GameCover from "../../../../../components/game/GameCover";
import Specimen from "../../../components/Specimen";

const SurfaceSpecimens = () => {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <Specimen
                title="Plates"
                notes="The signature device. Anything you own is pressed into the paper; anything the system tells you sits on top of it. Pressed-versus-raised is how state reads before colour arrives, which is what makes the whole system survive greyscale."
                meta='plateClass(state, depth, className) — state="pressed" | "raised" | "flat" · depth="shallow" | "deep"'
            >
                {(
                    [
                        ["pressed", "shallow"],
                        ["pressed", "deep"],
                        ["raised", "shallow"],
                        ["flat", "shallow"],
                    ] as const
                ).map(([state, depth]) => (
                    <div key={`${state}-${depth}`} className="text-center">
                        <Plate state={state} depth={depth} className="size-24" />
                        <p className="mt-2 text-label-sm text-content-muted">
                            {state}
                            {depth === "deep" && " deep"}
                        </p>
                    </div>
                ))}
            </Specimen>

            <Specimen
                title="Card with ledger rows"
                notes="A raised plate holding facts. The pairing of a title, a rule and a run of leader-dot rows is the page's basic unit."
                meta="Card · CardHeader · cardClass"
            >
                <Card className="w-full max-w-sm">
                    <CardHeader>Card · ledger rows</CardHeader>
                    <p className="mt-1 font-display text-section text-content">
                        Lanternfall
                    </p>
                    <LedgerList className="mt-2">
                        <LedgerRow label="Status" value="Mastered" />
                        <LedgerRow label="Hours" value="52.5h" />
                        <LedgerRow
                            label="Achievements"
                            value="46/52"
                            rule={false}
                        />
                    </LedgerList>
                    <div className="mt-3 flex gap-2">
                        <Button className="flex-1">Edit log</Button>
                        <Button variant="secondary" className="flex-1">
                            Share
                        </Button>
                    </div>
                </Card>
            </Specimen>

            <Specimen
                title="Game cover"
                notes="Box art is the only saturated thing on a page. The placeholder is a pressed well rather than a broken image — an empty src would re-request the document."
                meta="coverUrl · title · className"
            >
                <GameCover
                    coverUrl={null}
                    title="No cover"
                    className="w-28 shadow-cover"
                />
            </Specimen>

            <Specimen
                title="Modal"
                notes="A double rule under the header, an ESC affordance, and the deepest cast shadow in the system. Escape and a backdrop mousedown both close; focus moves in and is restored on the way out."
                meta="onClose · labelledBy · showCloseButton · className"
            >
                <Button onClick={() => setModalOpen(true)}>Open modal</Button>
                {modalOpen && (
                    <Modal
                        onClose={() => setModalOpen(false)}
                        labelledBy="demo-modal-title"
                        className="w-[440px]"
                    >
                        <div className="flex items-baseline justify-between rule-double pb-3">
                            <h2
                                id="demo-modal-title"
                                className="font-display text-section text-content"
                            >
                                Delete this log?
                            </h2>
                            <span className="text-label-sm text-content-muted">
                                Esc
                            </span>
                        </div>
                        <p className="py-4 text-body-sm text-content-secondary">
                            Lanternfall will come off your shelf, along with the
                            52 hours and the review. The game stays in the
                            catalogue.
                        </p>
                        <div className="flex justify-end gap-2 border-t border-strong pt-3">
                            <Button
                                variant="secondary"
                                onClick={() => setModalOpen(false)}
                            >
                                Keep it
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => setModalOpen(false)}
                            >
                                Delete log
                            </Button>
                        </div>
                    </Modal>
                )}
            </Specimen>
        </>
    );
};

export default SurfaceSpecimens;
