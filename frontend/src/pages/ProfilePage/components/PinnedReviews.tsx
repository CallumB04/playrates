import { useState } from "react";
import { Pin } from "lucide-react";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import {
    usePinnedReviews,
    useUserReviews,
} from "../../../hooks/queries/useReviews";
import { useEditParam } from "../lib/useEditParam";
import { usePinReviews } from "../lib/usePinReviews";
import ChoosePins from "./ChoosePins";
import ReviewRow from "./ReviewRow";

interface PinnedReviewsProps {
    username: string;
    ids: number[];
    isOwner: boolean;
}

/** The reviews a member pinned to the top of their profile. Its owner,
 *  once they have room for one, sees it empty too, with a way to choose. */
const PinnedReviews = ({ username, ids, isOwner }: PinnedReviewsProps) => {
    const { data } = usePinnedReviews(username, ids);
    if (isOwner)
        return <OwnPinnedReviews username={username} shown={data ?? []} />;
    if (!data?.length) return null;
    return (
        <Panel
            title={<Title count={data.length} />}
            bodyClassName="flex flex-col gap-1 p-2"
        >
            {data.map((review) => (
                <ReviewRow key={review.id} review={review} />
            ))}
        </Panel>
    );
};

const Title = ({ count }: { count: number }) => (
    <span className="inline-flex items-center gap-2">
        <Pin size={15} aria-hidden className="text-brand" />
        Pinned {count === 1 ? "review" : "reviews"}
    </span>
);

const OwnPinnedReviews = ({
    username,
    shown,
}: {
    username: string;
    shown: Parameters<typeof ReviewRow>[0]["review"][];
}) => {
    const { slots } = usePinReviews();
    const [asked, doneAsking] = useEditParam("pinned_reviews");
    const [choosing, setChoosing] = useState(false);
    if (slots === 0) return null;
    return (
        <Panel
            title={<Title count={Math.max(1, shown.length)} />}
            trailing={
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChoosing(true)}
                    className="-my-1 max-sm:min-h-11"
                >
                    Choose
                </Button>
            }
            bodyClassName="flex flex-col gap-1 p-2"
        >
            {shown.length > 0 ? (
                shown.map((review) => (
                    <ReviewRow key={review.id} review={review} />
                ))
            ) : (
                <p className="px-2 py-3 text-body-sm text-content-muted">
                    Pin up to {slots} of your reviews here, for everyone to see
                    first.
                </p>
            )}
            {(choosing || asked) && (
                <ChooseReviews
                    username={username}
                    onClose={() => {
                        setChoosing(false);
                        doneAsking();
                    }}
                />
            )}
        </Panel>
    );
};

/** Your reviews, to pick the pinned ones from, in order. */
const ChooseReviews = ({
    username,
    onClose,
}: {
    username: string;
    onClose: () => void;
}) => {
    const { slots, pinned, save, saving } = usePinReviews();
    const { data, isLoading } = useUserReviews(username, {
        page: 1,
        limit: 50,
    });
    return (
        <ChoosePins
            title="Pinned reviews"
            slots={slots}
            slotItem="slot_pinned_review"
            pinned={pinned}
            choices={(data?.data ?? []).map((review) => ({
                id: review.id,
                title: review.game.title,
                detail: review.body,
            }))}
            loading={isLoading}
            saving={saving}
            onSave={(picked) => save(picked, onClose)}
            onClose={onClose}
        />
    );
};

export default PinnedReviews;
