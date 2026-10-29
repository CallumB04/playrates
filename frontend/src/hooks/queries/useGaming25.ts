import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Game, Gaming25, Gaming25Category } from "@playrates/shared";
import {
    clearGaming25Pick,
    fetchGaming25,
    fetchMostLovedGaming25s,
    queryKeys,
    setGaming25Pick,
    toggleGaming25Love,
} from "../../api";
import type { PickedGame } from "../../components/community/GamePicker";
import { inGridOrder } from "../../lib/gaming25";

export const useGaming25 = (username: string, enabled = true) =>
    useQuery({
        queryKey: queryKeys.gaming25.byUsername(username),
        queryFn: () => fetchGaming25(username),
        enabled: enabled && !!username,
    });

export const useMostLovedGaming25s = (limit: number) =>
    useQuery({
        queryKey: queryKeys.gaming25.mostLoved(limit),
        queryFn: () => fetchMostLovedGaming25s(limit),
    });

const PICK_KEY = ["gaming25", "pick"];

type PickChange = { category: Gaming25Category; game: PickedGame | null };

/**
 * One cell of your own, shown filled before it saves, so a run of picks
 * through the sheet never waits on the network; put back if it fails.
 */
export const useSetGaming25Pick = (username: string) => {
    const client = useQueryClient();
    const key = queryKeys.gaming25.byUsername(username);
    return useMutation({
        mutationKey: PICK_KEY,
        mutationFn: ({ category, game }: PickChange) =>
            game
                ? setGaming25Pick(category, game.id)
                : clearGaming25Pick(category),
        onMutate: async ({ category, game }) => {
            await client.cancelQueries({ queryKey: key });
            const before = client.getQueryData<Gaming25>(key);
            if (before) {
                const rest = before.picks.filter(
                    (p) => p.category !== category
                );
                client.setQueryData<Gaming25>(key, {
                    ...before,
                    picks: inGridOrder(
                        game
                            ? [
                                  ...rest,
                                  // Enough of a game for its cell until the
                                  // saved one arrives.
                                  { category, game: game as unknown as Game },
                              ]
                            : rest
                    ),
                });
            }
            return { before };
        },
        onError: (_error, _change, context) => {
            if (context?.before) client.setQueryData(key, context.before);
        },
        onSettled: () => {
            /* Picks made in a run can be answered out of order, so no one
               answer is the grid; the last to settle fetches it whole. */
            if (client.isMutating({ mutationKey: PICK_KEY }) > 1) return;
            return client.invalidateQueries({
                queryKey: queryKeys.gaming25.all,
            });
        },
    });
};

export const useGaming25Love = (username: string) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => toggleGaming25Love(username),
        onSuccess: (result) => {
            client.setQueryData<Gaming25>(
                queryKeys.gaming25.byUsername(username),
                (grid) => grid && { ...grid, ...result }
            );
            return client.invalidateQueries({
                queryKey: queryKeys.gaming25.all,
                predicate: (query) => query.queryKey[1] === "most-loved",
            });
        },
    });
};
