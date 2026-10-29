import { useState } from "react";
import { Check } from "lucide-react";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import GameCover from "../game/GameCover";
import { useGames } from "../../hooks/queries/useGames";
import { useLogMutations } from "../../hooks/queries/useGameLogs";
import { useNotify } from "../../contexts/NotificationContext";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

const SHOWN = 12;

interface PlayedGamesStepProps {
    titleId: string;
    /** Walks it without logging a thing, for the admin preview. */
    preview?: boolean;
    onDone: () => void;
}

/**
 * The welcome's second step: the games most logged here, to tap the ones
 * already played. An empty shelf is the hardest place to start, and these
 * are the likeliest to have been played.
 */
const PlayedGamesStep = ({
    titleId,
    preview = false,
    onDone,
}: PlayedGamesStepProps) => {
    const { data, isLoading } = useGames({
        sort: "logged",
        limit: SHOWN,
        count: false,
    });
    const { create } = useLogMutations();
    const notify = useNotify();
    const [picked, setPicked] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const toggle = (id: number) =>
        setPicked((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
        );

    const add = async () => {
        if (preview) return onDone();
        setSaving(true);
        const results = await Promise.allSettled(
            picked.map((gameId) =>
                create.mutateAsync({ gameId, status: "played" })
            )
        );
        setSaving(false);
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0)
            notify(
                `${formatCount(failed)} of those didn't save. Add them from their pages.`,
                "error"
            );
        onDone();
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="pr-11 sm:pr-8">
                <h2
                    id={titleId}
                    className="font-display text-section text-content"
                >
                    Games you’ve played
                </h2>
                <p className="mt-1.5 text-body-sm text-content-secondary">
                    Tap any you’ve played to put them on your shelves. You can
                    rate them and add the rest later.
                </p>
            </div>

            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {isLoading
                    ? Array.from({ length: SHOWN }, (_, i) => (
                          <li key={i}>
                              <Skeleton className="aspect-3/4 rounded-xs" />
                          </li>
                      ))
                    : (data?.data ?? []).map((game) => {
                          const on = picked.includes(game.id);
                          return (
                              <li key={game.id}>
                                  <button
                                      type="button"
                                      aria-pressed={on}
                                      aria-label={game.title}
                                      onClick={() => toggle(game.id)}
                                      className={cn(
                                          "relative block w-full cursor-pointer overflow-hidden rounded-xs lift",
                                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                          on && "ring-2 ring-brand"
                                      )}
                                  >
                                      <GameCover
                                          coverUrl={game.coverUrl}
                                          title={game.title}
                                          className={cn(
                                              "aspect-3/4 w-full transition-opacity",
                                              on && "opacity-60"
                                          )}
                                      />
                                      {on && (
                                          <span
                                              aria-hidden
                                              className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-brand text-content-on-solid"
                                          >
                                              <Check
                                                  size={14}
                                                  strokeWidth={3}
                                              />
                                          </span>
                                      )}
                                  </button>
                              </li>
                          );
                      })}
            </ul>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    variant="ghost"
                    onClick={onDone}
                    disabled={saving}
                    className="w-full sm:w-auto"
                >
                    Skip for now
                </Button>
                <Button
                    onClick={() => void add()}
                    disabled={picked.length === 0 || saving}
                    className="w-full sm:w-auto"
                >
                    {saving
                        ? "Adding…"
                        : picked.length === 0
                          ? "Add to my shelves"
                          : `Add ${formatCount(picked.length)} ${picked.length === 1 ? "game" : "games"}`}
                </Button>
            </div>
        </div>
    );
};

export default PlayedGamesStep;
