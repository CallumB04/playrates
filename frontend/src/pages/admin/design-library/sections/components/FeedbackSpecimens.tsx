import Progress from "../../../../../components/ui/Progress";
import Skeleton, {
    TextSkeleton,
    TileSkeleton,
} from "../../../../../components/ui/Skeleton";
import EmptyPlate, {
    GhostTile,
} from "../../../../../components/ui/EmptyPlate";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import Button from "../../../../../components/ui/Button";
import Specimen from "../../../components/Specimen";
import { cn } from "../../../../../lib/cn";

const TOASTS = [
    {
        tone: "border-l-success text-success",
        title: "Entry saved",
        body: "Lanternfall · 9.00 · 52.5h",
        action: "Undo",
    },
    {
        tone: "border-l-status-playing text-status-playing",
        title: "Moved to playing",
        body: "Started today",
        action: "View",
    },
    {
        tone: "border-l-danger text-danger",
        title: "Couldn't reach Steam",
        body: "Import paused at 42 of 318",
        action: "Retry",
    },
];

const FeedbackSpecimens = () => (
    <>
        <Specimen
            title="Toasts"
            stack
            notes="A raised chip with a tone rule down one edge. The colour is the only thing that varies — the shape is constant so a toast is recognisable before it's read."
            meta="Rendered by Notification from the notification context"
        >
            {TOASTS.map((toast) => (
                <div
                    key={toast.title}
                    className={cn(
                        "flex w-full max-w-md items-center gap-3 border border-strong border-l-[3px] bg-surface-raised px-3.5 py-3 shadow-toast",
                        toast.tone
                    )}
                >
                    <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-medium text-content">
                            {toast.title}
                        </p>
                        <p className="mt-0.5 text-xs text-content-muted">
                            {toast.body}
                        </p>
                    </div>
                    <span className="font-mono text-label-sm uppercase text-brand">
                        {toast.action}
                    </span>
                </div>
            ))}
        </Specimen>

        <Specimen
            title="Loading"
            stack
            notes="Determinate is a filled well. Indeterminate is a sweep of ticks — the same rule vocabulary rather than a spinner, and it holds still under reduced motion rather than vanishing."
            meta="Progress value · label · LoadingSpinner size"
        >
            <div className="w-full max-w-md">
                <Progress value={0.42} label="Importing library" />
                <p className="mt-2 font-mono text-label-sm uppercase text-content-muted">
                    Determinate — import 42%
                </p>
            </div>
            <div className="w-full max-w-md">
                <Progress label="Loading" />
                <p className="mt-2 font-mono text-label-sm uppercase text-content-muted">
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
            notes="An empty drawer slot, not a shimmer — the well is pressed in and stays still. Aria-hidden throughout: the region that owns them carries the live status."
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
            notes="Two dashed cards beside one real one — the shelf shows you what it will look like. The charm comes from the writing and the drawer metaphor, not from an illustration."
            meta="EmptyPlate eyebrow · title · body · action · GhostTile"
        >
            <EmptyPlate
                eyebrow="Nothing on file"
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

export default FeedbackSpecimens;
