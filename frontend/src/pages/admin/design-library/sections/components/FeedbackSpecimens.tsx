import {
    useNotify,
    type NotificationSeverity,
    type NotificationType,
} from "../../../../../contexts/NotificationContext";
import {
    DWELL_MS,
    MAX_VISIBLE,
} from "../../../../../contexts/notificationQueue";
import Progress from "../../../../../components/ui/Progress";
import Skeleton, {
    TextSkeleton,
    TileSkeleton,
} from "../../../../../components/ui/Skeleton";
import EmptyPlate, { GhostTile } from "../../../../../components/ui/EmptyPlate";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import Button from "../../../../../components/ui/Button";
import Specimen from "../../../components/Specimen";

interface ToastSpecimen {
    label: string;
    text: string;
    type: NotificationType;
    severity?: NotificationSeverity;
}

const TOASTS: ToastSpecimen[] = [
    {
        label: "Success",
        text: "Lanternfall added to your shelf",
        type: "success",
    },
    { label: "Info", text: "Import paused at 42 of 318", type: "info" },
    { label: "Error", text: "Couldn't reach Steam", type: "error" },
    {
        label: "Critical error",
        text: "Entry saved, but your note didn't send",
        type: "error",
        severity: "critical",
    },
];

const FeedbackSpecimens = () => {
    const notify = useNotify();

    return (
        <>
            <Specimen
                title="Toasts"
                notes={`The same plate as every other surface — no coloured edge. The icon carries the status, and the line along the bottom carries the dwell: ${DWELL_MS.low! / 1000}s for a success, ${DWELL_MS.high! / 1000}s for an error. A critical one holds its line full, because nothing takes it away but the X. At most ${MAX_VISIBLE} stand at once; a fourth collapses the oldest out from under them.`}
                meta="ToastStack · notify(text, type, severity)"
            >
                {TOASTS.map((toast) => (
                    <Button
                        key={toast.label}
                        variant="secondary"
                        onClick={() =>
                            notify(toast.text, toast.type, toast.severity)
                        }
                    >
                        {toast.label}
                    </Button>
                ))}
            </Specimen>

            <Specimen
                title="Loading"
                stack
                notes="Determinate is a filled track. Indeterminate is a sweep of ticks rather than a spinner, and it holds still under reduced motion rather than vanishing."
                meta="Progress value · label · LoadingSpinner size"
            >
                <div className="w-full max-w-md">
                    <Progress value={0.42} label="Importing library" />
                    <p className="mt-2 text-label-sm text-content-muted">
                        Determinate — import 42%
                    </p>
                </div>
                <div className="w-full max-w-md">
                    <Progress label="Loading" />
                    <p className="mt-2 text-label-sm text-content-muted">
                        Indeterminate — tick sweep
                    </p>
                </div>
                <div className="flex items-end gap-4">
                    <LoadingSpinner size="sm" />
                    <LoadingSpinner size="md" />
                    <LoadingSpinner size="lg" />
                </div>
            </Specimen>

            <Specimen
                title="Skeletons"
                notes="A quiet placeholder, not a shimmer. Aria-hidden throughout: the region that owns them carries the live status."
                meta="Skeleton · TileSkeleton · TextSkeleton lines"
            >
                <div className="w-28">
                    <TileSkeleton />
                </div>
                <div className="w-64">
                    <TextSkeleton lines={3} />
                </div>
                <Skeleton className="h-11 w-32" />
            </Specimen>

            <Specimen
                title="Empty states"
                stack
                notes="Two dashed slots beside one real cover — the shelf shows you what it will look like once it has something in it. The charm comes from the writing, not from an illustration."
                meta="EmptyPlate eyebrow · title · body · action · GhostTile"
            >
                <EmptyPlate
                    title="Your shelf is empty"
                    body="Log the last game you finished — even if that was years ago. The shelf is more useful when it's honest than when it's current."
                    action={<Button>Log a game</Button>}
                    className="w-full"
                />
                <div className="grid w-full max-w-md grid-cols-3 gap-4">
                    <div className="aspect-3/4 bg-surface-media shadow-cover" />
                    <GhostTile />
                    <GhostTile />
                </div>
            </Specimen>
        </>
    );
};

export default FeedbackSpecimens;
