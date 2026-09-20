import { useState } from "react";
import type {
    GameStatus,
    PlayedStatus,
} from "../../../../../constants/gameStatus";
import { Search } from "lucide-react";
import {
    Input,
    NumberInput,
    SearchInput,
    Select,
    Textarea,
} from "../../../../../components/ui/Input";
import Field from "../../../../../components/ui/Field";
import {
    StatusPlates,
    PlayedStatusPlates,
} from "../../../../../components/gamelog/StatusPlates";
import RatingRule from "../../../../../components/ui/RatingRule";
import Specimen from "../../../components/Specimen";

const FormSpecimens = () => {
    const [rating, setRating] = useState<number | null>(8.25);
    const [status, setStatus] = useState<GameStatus>("played");
    const [playedStatus, setPlayedStatus] = useState<PlayedStatus | null>(
        "mastered"
    );
    const [body, setBody] = useState(
        "The light meter is the whole game and it took me until the third act to notice."
    );

    return (
        <>
            <Specimen
                title="Fields"
                notes="Recessed by default — a field is something you own, so it's pressed into the paper. Focus is a brand rule and nothing else: no glow, and the deboss survives. Error tints the well rather than adding an icon."
                meta="Input · NumberInput · Textarea · SearchInput — all forwardRef"
            >
                <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Text" help="Recessed, hairline border">
                        {(a11y) => <Input defaultValue="ashgrove" {...a11y} />}
                    </Field>

                    <Field label="Error" error="Usernames can't contain spaces">
                        {(a11y) => <Input defaultValue="a grove" {...a11y} />}
                    </Field>

                    <Field label="Disabled" help="Verified accounts can't rename">
                        {(a11y) => (
                            <Input defaultValue="locked" disabled {...a11y} />
                        )}
                    </Field>

                    <Field label="Number" help="Tabular, unit on the right">
                        {(a11y) => (
                            <NumberInput defaultValue={52.5} step={0.5} {...a11y} />
                        )}
                    </Field>
                </div>
            </Specimen>

            <Specimen
                title="Select and search"
                notes="A select is the documented exception to the recess: it's raised, because it opens. Pressed-versus-raised has to keep meaning what it says."
                meta="Select · SearchInput"
            >
                <div className="grid w-full gap-4 sm:grid-cols-2">
                    <Field label="Select" help="Raised, not recessed — it opens">
                        {(a11y) => (
                            <Select defaultValue="all" {...a11y}>
                                <option value="all">All platforms</option>
                                <option value="steam">Steam</option>
                                <option value="xbox">Xbox</option>
                            </Select>
                        )}
                    </Field>

                    <Field label="Search" help="312 matches">
                        {(a11y) => (
                            <div className="relative">
                                <Search
                                    size={14}
                                    aria-hidden
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
                                />
                                <SearchInput
                                    defaultValue="lantern"
                                    {...a11y}
                                />
                            </div>
                        )}
                    </Field>
                </div>
            </Specimen>

            <Specimen
                title="Textarea"
                stack
                notes="The counter is the help slot, so a field never grows a bespoke footer."
                meta="Textarea"
            >
                <Field label="Review" help={`${body.length} / 5000`}>
                    {(a11y) => (
                        <Textarea
                            rows={3}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            maxLength={5000}
                            {...a11y}
                        />
                    )}
                </Field>
            </Specimen>

            <Specimen
                title="Status plates"
                stack
                notes="Segmented, and pressed rather than tinted — the selected plate rises out of the deboss with a status-hue top edge. Selecting a status that cannot carry a substatus clears the substatus rather than dropping it silently at save."
                meta="StatusPlates · PlayedStatusPlates — aria-pressed per plate"
            >
                <StatusPlates value={status} onChange={setStatus} />
                {status === "played" && (
                    <PlayedStatusPlates
                        value={playedStatus}
                        onChange={setPlayedStatus}
                    />
                )}
            </Specimen>

            <Specimen
                title="Rating setter — 40 detents"
                stack
                notes="A tabular numeral is the display; a recessed 40-detent rule is the setter. Glanceable in a grid of forty, thumb-sized on touch, and never a row of quarter-filled stars. The detents are two repeating gradients rather than forty DOM nodes."
                meta="role=slider · 0–10 in 0.25 steps · ← → ±0.25, PgUp/PgDn ±1, Home/End, Backspace clears"
            >
                <RatingRule
                    value={rating}
                    onChange={setRating}
                    label="Your rating"
                />
            </Specimen>
        </>
    );
};

export default FormSpecimens;
