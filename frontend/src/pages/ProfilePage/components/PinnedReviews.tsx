import { useId, useState } from "react";
import { Check, Pin } from "lucide-react";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { Skeleton } from "../../../components/ui/Skeleton";
import {
    usePinnedReviews,
    useUserReviews,
} from "../../../hooks/queries/useReviews";
import { cn } from "../../../lib/cn";
import { useEditParam } from "../lib/useEditParam";
import { usePinReviews } from "../lib/usePinReviews";
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
    const titleId = useId();
    const { slots, pinned, save, saving } = usePinReviews();
    const [picked, setPicked] = useState<number[]>(pinned);
    const { data, isLoading } = useUserReviews(username, {
        page: 1,
        limit: 50,
    });
    const toggle = (id: number) =>
        setPicked((p) =>
            p.includes(id)
                ? p.filter((x) => x !== id)
                : p.length < slots
                  ? [...p, id]
                  : p
        );

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-lg"
        >
            <h2 id={titleId} className="font-display text-section text-content">
                Pinned reviews
            </h2>
            <p className="mt-1 text-body-sm text-content-secondary">
                Tap up to {slots}, in the order you want them. {picked.length}{" "}
                of {slots}.
            </p>
            <ul className="mt-4 flex max-h-96 flex-col gap-1 overflow-y-auto">
                {isLoading
                    ? [0, 1, 2].map((i) => (
                          <Skeleton key={i} className="h-12 rounded-md" />
                      ))
                    : (data?.data ?? []).map((review) => {
                          const at = picked.indexOf(review.id);
                          const full = at < 0 && picked.length >= slots;
                          return (
                              <li key={review.id}>
                                  <button
                                      type="button"
                                      aria-pressed={at >= 0}
                                      disabled={full}
                                      onClick={() => toggle(review.id)}
                                      className={cn(
                                          "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-45",
                                          "focus-visible:outline-2 focus-visible:outline-brand",
                                          at >= 0
                                              ? "bg-brand-subtle"
                                              : "hover:bg-surface-hover"
                                      )}
                                  >
                                      <span
                                          className={cn(
                                              "grid size-5 shrink-0 place-items-center rounded-full text-label-sm font-semibold",
                                              at >= 0
                                                  ? "bg-brand text-content-on-solid"
                                                  : "ring-1 ring-strong"
                                          )}
                                      >
                                          {at >= 0 ? at + 1 : ""}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                          <span className="block truncate text-body-sm font-medium text-content">
                                              {review.game.title}
                                          </span>
                                          <span className="block truncate text-label-sm text-content-muted">
                                              {review.body}
                                          </span>
                                      </span>
                                  </button>
                              </li>
                          );
                      })}
            </ul>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>
                <Button
                    disabled={saving}
                    onClick={() => save(picked, onClose)}
                    className="w-full sm:w-auto"
                >
                    <Check size={15} aria-hidden />
                    Save
                </Button>
            </div>
        </Modal>
    );
};

export default PinnedReviews;
