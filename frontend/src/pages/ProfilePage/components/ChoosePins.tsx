import { useId, useState } from "react";
import { Check } from "lucide-react";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";

export interface PinChoice {
    id: number;
    title: string;
    detail: string;
}

/** Your reviews or lists, to pick the pinned ones from, in order. */
const ChoosePins = ({
    title,
    slots,
    pinned,
    choices,
    loading,
    saving,
    onSave,
    onClose,
}: {
    title: string;
    slots: number;
    pinned: number[];
    choices: PinChoice[];
    loading: boolean;
    saving: boolean;
    onSave: (picked: number[]) => void;
    onClose: () => void;
}) => {
    const titleId = useId();
    const [picked, setPicked] = useState<number[]>(pinned);
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
                {title}
            </h2>
            <p className="mt-1 text-body-sm text-content-secondary">
                Tap up to {slots}, in the order you want them. {picked.length}{" "}
                of {slots}.
            </p>
            <ul className="mt-4 flex max-h-96 flex-col gap-1 overflow-y-auto">
                {loading
                    ? [0, 1, 2].map((i) => (
                          <Skeleton key={i} className="h-12 rounded-md" />
                      ))
                    : choices.map((choice) => {
                          const at = picked.indexOf(choice.id);
                          const full = at < 0 && picked.length >= slots;
                          return (
                              <li key={choice.id}>
                                  <button
                                      type="button"
                                      aria-pressed={at >= 0}
                                      disabled={full}
                                      onClick={() => toggle(choice.id)}
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
                                              {choice.title}
                                          </span>
                                          <span className="block truncate text-label-sm text-content-muted">
                                              {choice.detail}
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
                    onClick={() => onSave(picked)}
                    className="w-full sm:w-auto"
                >
                    <Check size={15} aria-hidden />
                    Save
                </Button>
            </div>
        </Modal>
    );
};

export default ChoosePins;
