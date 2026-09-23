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
    Textarea,
} from "../../../../../components/ui/Input";
import Field from "../../../../../components/ui/Field";
import {
    StatusPlates,
    PlayedStatusSelect,
} from "../../../../../components/gamelog/StatusPlates";
import RatingMeter from "../../../../../components/ui/RatingMeter";
import RatingBadge from "../../../../../components/ui/RatingBadge";
import Dropdown from "../../../../../components/ui/Dropdown";
import { platformOptions } from "../../../../../lib/platformIcons";
import Specimen from "../../../components/Specimen";

const FormSpecimens = () => {
    const [rating, setRating] = useState<number | null>(8.5);
    const [platform, setPlatform] = useState("");
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
                notes="A field sits level with the page and lights up when you are in it: the border warms to the brand and a soft bloom appears behind it. Error tints the field rather than adding an icon."
                meta="Input · NumberInput · Textarea · SearchInput — all forwardRef"
            >
                <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Text" help="Recessed, hairline border">
                        {(a11y) => <Input defaultValue="ashgrove" {...a11y} />}
                    </Field>

                    <Field label="Error" error="Usernames can't contain spaces">
                        {(a11y) => <Input defaultValue="a grove" {...a11y} />}
                    </Field>

                    <Field
                        label="Disabled"
                        help="Verified accounts can't rename"
                    >
                        {(a11y) => (
                            <Input defaultValue="locked" disabled {...a11y} />
                        )}
                    </Field>

                    <Field label="Number" help="Tabular, unit on the right">
                        {(a11y) => (
                            <NumberInput
                                defaultValue={52.5}
                                step={0.5}
                                {...a11y}
                            />
                        )}
                    </Field>
                </div>
            </Specimen>

            <Specimen
                title="Dropdown and search"
                notes="A native select takes the platform's own popup: no icon, no hint line, no tick beside what is chosen, and a font that belongs to nothing else on the page. This keeps the field skin and owns the menu. Arrows move, Enter commits, Escape closes."
                meta="Dropdown · SearchInput"
            >
                <div className="grid w-full gap-4 sm:grid-cols-2">
                    <Field label="Dropdown" help="Icons, hints and a tick">
                        {(a11y) => (
                            <Dropdown
                                options={platformOptions(
                                    [
                                        { slug: "steam", displayName: "Steam" },
                                        { slug: "xbox", displayName: "Xbox" },
                                        {
                                            slug: "playstation",
                                            displayName: "Playstation",
                                        },
                                    ],
                                    "All platforms"
                                )}
                                value={platform}
                                onChange={setPlatform}
                                {...a11y}
                            />
                        )}
                    </Field>

                    <Field label="Search" help="312 matches">
                        {(a11y) => (
                            <div className="relative">
                                <Search
                                    size={14}
                                    aria-hidden
                                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
                                />
                                <SearchInput defaultValue="lantern" {...a11y} />
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
                notes="Segmented. The selected plate lifts and lights, with a status-hue top edge; the rest sit flat. The substatus refines a played log rather than standing beside it, so it is a menu — open by default on Just played, which saves as no substatus at all. Selecting a status that cannot carry one clears it rather than dropping it silently at save."
                meta="StatusPlates — aria-pressed per plate · PlayedStatusSelect"
            >
                <StatusPlates value={status} onChange={setStatus} />
                {status === "played" && (
                    <PlayedStatusSelect
                        value={playedStatus}
                        onChange={setPlayedStatus}
                    />
                )}
            </Specimen>

            <Specimen
                title="Rating setter"
                stack
                notes="Twenty segments, one per allowed value. Stars were tried and dropped: a half star has to be drawn by clipping a glyph down the middle, which reads as a rendering fault rather than a half. A segment either fills or it does not. The badge below is the same vocabulary at display size, so a rating looks like itself wherever it appears."
                meta="role=slider · 0 to 10 in 0.5 steps · arrows ±0.5, PgUp/PgDn ±1, Home/End, Backspace clears"
            >
                <div className="flex w-full flex-col gap-5">
                    <RatingMeter
                        value={rating}
                        onChange={setRating}
                        label="Your rating"
                    />
                    <div className="flex items-end gap-6 border-t border-subtle pt-4">
                        <RatingBadge value={rating} />
                        <RatingBadge value={rating} size="md" />
                        <RatingBadge value={rating} size="lg" />
                    </div>
                </div>
            </Specimen>
        </>
    );
};

export default FormSpecimens;
