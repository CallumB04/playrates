import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AwardPicks, EventDetail, ShowcaseHype } from "@playrates/shared";
import {
    fetchAdminEvent,
    fetchAdminEvents,
    fetchCurrentEvent,
    fetchEvent,
    fetchEvents,
    fetchGameEvents,
    fetchHeldEventBadges,
    fetchMyEventBadges,
    fetchMyHype,
    fetchMyPicks,
    queryKeys,
    setMyHype,
    setMyPick,
} from "../../api";
import { picksWith, withHype, withPick } from "../../lib/events";

const FIVE_MINUTES = 5 * 60_000;

export const useEvents = () =>
    useQuery({
        queryKey: queryKeys.events.list,
        queryFn: fetchEvents,
        staleTime: FIVE_MINUTES,
    });

export const useCurrentEvent = () =>
    useQuery({
        queryKey: queryKeys.events.current,
        queryFn: fetchCurrentEvent,
        staleTime: FIVE_MINUTES,
    });

export const useEvent = (slug: string) =>
    useQuery({
        queryKey: queryKeys.events.bySlug(slug),
        queryFn: () => fetchEvent(slug),
        enabled: !!slug,
    });

export const useGameEvents = (gameId: number) =>
    useQuery({
        queryKey: queryKeys.events.forGame(gameId),
        queryFn: () => fetchGameEvents(gameId),
        enabled: Number.isFinite(gameId) && gameId > 0,
        staleTime: FIVE_MINUTES,
    });

/** Someone's event badges, for their profile. */
export const useHeldEventBadges = (username: string) =>
    useQuery({
        queryKey: queryKeys.events.held(username),
        queryFn: () => fetchHeldEventBadges(username),
        enabled: !!username,
    });

export const useMyEventBadges = (slug: string, signedIn: boolean) =>
    useQuery({
        queryKey: queryKeys.events.badges(slug),
        queryFn: () => fetchMyEventBadges(slug),
        enabled: !!slug && signedIn,
    });

export const useMyHype = (slug: string, signedIn: boolean) =>
    useQuery({
        queryKey: queryKeys.events.hype(slug),
        queryFn: () => fetchMyHype(slug),
        enabled: !!slug && signedIn,
    });

/** Hype shows straight away, the count moving with it, and is put back if
 *  it fails. A badge it earns is fetched after. */
export const useSetHype = (slug: string) => {
    const client = useQueryClient();
    const hypeKey = queryKeys.events.hype(slug);
    const eventKey = queryKeys.events.bySlug(slug);
    return useMutation({
        mutationFn: ({ revealId, on }: { revealId: number; on: boolean }) =>
            setMyHype(slug, revealId, on),
        onMutate: async ({ revealId, on }) => {
            await client.cancelQueries({ queryKey: hypeKey });
            const hype = client.getQueryData<ShowcaseHype>(hypeKey) ?? [];
            const event = client.getQueryData<EventDetail>(eventKey);
            client.setQueryData(
                hypeKey,
                on
                    ? [...new Set([...hype, revealId])]
                    : hype.filter((id) => id !== revealId)
            );
            if (event) {
                client.setQueryData(eventKey, withHype(event, revealId, on));
            }
            return { hype, event };
        },
        onError: (_error, _change, context) => {
            if (!context) return;
            client.setQueryData(hypeKey, context.hype);
            if (context.event) client.setQueryData(eventKey, context.event);
        },
        onSuccess: (hype) => {
            client.setQueryData(hypeKey, hype);
            void client.invalidateQueries({
                queryKey: queryKeys.events.badges(slug),
            });
        },
    });
};

export const useMyPicks = (slug: string, signedIn: boolean) =>
    useQuery({
        queryKey: queryKeys.events.picks(slug),
        queryFn: () => fetchMyPicks(slug),
        enabled: !!slug && signedIn,
    });

type PickChange = { categoryId: number; nomineeId: number | null };

/**
 * A pick shows straight away, the crowd's numbers moving with it, and is put
 * back if it fails. The counts aren't fetched again after: the server's are
 * cached for a minute, so they would only undo the step just shown.
 */
export const useSetPick = (slug: string) => {
    const client = useQueryClient();
    const picksKey = queryKeys.events.picks(slug);
    const eventKey = queryKeys.events.bySlug(slug);
    return useMutation({
        mutationFn: ({ categoryId, nomineeId }: PickChange) =>
            setMyPick(slug, categoryId, nomineeId),
        onMutate: async ({ categoryId, nomineeId }) => {
            await client.cancelQueries({ queryKey: picksKey });
            const picks = client.getQueryData<AwardPicks>(picksKey) ?? {};
            const event = client.getQueryData<EventDetail>(eventKey);
            client.setQueryData(
                picksKey,
                picksWith(picks, categoryId, nomineeId)
            );
            if (event) {
                client.setQueryData(
                    eventKey,
                    withPick(event, picks, categoryId, nomineeId)
                );
            }
            return { picks, event };
        },
        onError: (_error, _change, context) => {
            if (!context) return;
            client.setQueryData(picksKey, context.picks);
            if (context.event) client.setQueryData(eventKey, context.event);
        },
        onSuccess: (picks) => {
            client.setQueryData(picksKey, picks);
            void client.invalidateQueries({
                queryKey: queryKeys.events.badges(slug),
            });
        },
    });
};

/* Admin. Every change answers with the whole event, which becomes the
   editor's copy at once; the public views are refetched after. */

export const useAdminEvents = () =>
    useQuery({
        queryKey: queryKeys.admin.events,
        queryFn: fetchAdminEvents,
    });

export const useAdminEvent = (id: number | null) =>
    useQuery({
        queryKey: queryKeys.admin.event(id ?? 0),
        queryFn: () => fetchAdminEvent(id!),
        enabled: id !== null,
    });

export const useAdminEventChange = <T>(
    change: (input: T) => Promise<EventDetail>
) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: change,
        onSuccess: (event) => {
            client.setQueryData(queryKeys.admin.event(event.id), event);
            void client.invalidateQueries({ queryKey: queryKeys.admin.events });
            void client.invalidateQueries({ queryKey: queryKeys.events.all });
        },
    });
};
