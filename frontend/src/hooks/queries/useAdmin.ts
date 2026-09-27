import {
    keepPreviousData,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {
    AdminMetric,
    AdminPullInput,
    AdminRange,
    AnnouncementInput,
    GameEventGroup,
    ReportStatus,
    ResolveReportInput,
} from "@playrates/shared";
import {
    fetchAdminActivity,
    fetchAdminGameEvents,
    fetchAdminHealth,
    fetchAdminMetric,
    fetchAdminOverview,
    fetchAdminUser,
    fetchAdminUsers,
    fetchAdminReports,
    resolveReport,
    fetchAnnouncements,
    fetchAdminPatchNotes,
    announcePatchNote,
    sendTestPatchNote,
    fetchRawgUsage,
    fetchServerErrors,
    correctRawgUsage,
    importAdminGame,
    pullAdminGames,
    queryKeys,
    resyncAdminGame,
    retractAnnouncement,
    searchAdminGames,
    sendAnnouncement,
    sendTestAnnouncement,
    setAdminGameTrending,
    type AdminActivityFilters,
    type AdminUsersFilters,
} from "../../api";

/* Every hook here is only mounted inside the admin area, which is only
   rendered for the admin; the API refuses anyone else regardless. */

export const useAdminOverview = (range: AdminRange) =>
    useQuery({
        queryKey: queryKeys.admin.overview(range),
        queryFn: () => fetchAdminOverview(range),
        // switching range keeps the last chart up rather than flashing empty
        placeholderData: keepPreviousData,
    });

export const useAdminMetric = (metric: AdminMetric | null, range: AdminRange) =>
    useQuery({
        queryKey: queryKeys.admin.metric(metric ?? "", range),
        queryFn: () => fetchAdminMetric(metric!, range),
        enabled: metric !== null,
    });

export const useAdminActivity = (filters: AdminActivityFilters) =>
    useInfiniteQuery({
        queryKey: queryKeys.admin.activity({ ...filters }),
        queryFn: ({ pageParam }) => fetchAdminActivity(filters, pageParam),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (last) => last.nextBefore ?? undefined,
        placeholderData: keepPreviousData,
    });

export const useAdminUsers = (filters: AdminUsersFilters) =>
    useQuery({
        queryKey: queryKeys.admin.users({ ...filters }),
        queryFn: () => fetchAdminUsers(filters),
        placeholderData: keepPreviousData,
    });

export const useAdminUser = (id: string | null) =>
    useQuery({
        queryKey: queryKeys.admin.user(id ?? ""),
        queryFn: () => fetchAdminUser(id!),
        enabled: id !== null,
    });

export const useAdminGameEvents = (group: GameEventGroup | undefined) =>
    useInfiniteQuery({
        queryKey: queryKeys.admin.gameEvents(group ?? "all"),
        queryFn: ({ pageParam }) => fetchAdminGameEvents(group, pageParam),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (last) => last.nextBefore ?? undefined,
        placeholderData: keepPreviousData,
    });

export const useRawgUsage = () =>
    useQuery({
        queryKey: queryKeys.admin.rawgUsage,
        queryFn: fetchRawgUsage,
    });

export const useCorrectRawg = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (left: number) => correctRawgUsage(left),
        onSuccess: (usage) =>
            queryClient.setQueryData(queryKeys.admin.rawgUsage, usage),
    });
};

export const useAdminGameSearch = (q: string) =>
    useQuery({
        queryKey: queryKeys.admin.gameSearch(q),
        queryFn: () => searchAdminGames(q),
        enabled: q.trim().length >= 2,
        placeholderData: keepPreviousData,
    });

/** A catalogue change shows up in the game log, the quota and the search. */
const useCatalogueInvalidator = () => {
    const queryClient = useQueryClient();
    return () =>
        queryClient.invalidateQueries({ queryKey: ["admin", "games"] });
};

export const usePullGames = () => {
    const invalidate = useCatalogueInvalidator();
    return useMutation({
        mutationFn: (input: AdminPullInput) => pullAdminGames(input),
        onSettled: invalidate,
    });
};

export const useImportGame = () => {
    const invalidate = useCatalogueInvalidator();
    return useMutation({
        mutationFn: (rawgId: number) => importAdminGame(rawgId),
        onSettled: invalidate,
    });
};

export const useResyncGame = () => {
    const invalidate = useCatalogueInvalidator();
    return useMutation({
        mutationFn: (id: number) => resyncAdminGame(id),
        onSettled: invalidate,
    });
};

export const useSetTrending = () => {
    const queryClient = useQueryClient();
    const invalidate = useCatalogueInvalidator();
    return useMutation({
        mutationFn: ({ id, isTrending }: { id: number; isTrending: boolean }) =>
            setAdminGameTrending(id, isTrending),
        onSettled: () => {
            invalidate();
            // the home page's trending rail
            queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
        },
    });
};

export const useAnnouncements = () =>
    useQuery({
        queryKey: queryKeys.admin.announcements,
        queryFn: fetchAnnouncements,
    });

export const useSendAnnouncement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: AnnouncementInput) => sendAnnouncement(input),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.admin.announcements,
            });
            // the admin has an inbox too, and just got a copy
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            });
        },
    });
};

export const useSendTestAnnouncement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: AnnouncementInput) => sendTestAnnouncement(input),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            }),
    });
};

export const useAdminPatchNotes = () =>
    useQuery({
        queryKey: queryKeys.admin.patchNotes,
        queryFn: fetchAdminPatchNotes,
    });

export const useAnnouncePatchNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (messageId: number) => announcePatchNote(messageId),
        onSuccess: () => {
            // the history and the patch notes both
            queryClient.invalidateQueries({
                queryKey: queryKeys.admin.announcements,
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            });
        },
    });
};

export const useSendTestPatchNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (messageId: number) => sendTestPatchNote(messageId),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            }),
    });
};

export const useRetractAnnouncement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => retractAnnouncement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.admin.announcements,
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            });
        },
    });
};

export const useAdminHealth = () =>
    useQuery({
        queryKey: queryKeys.admin.health,
        queryFn: fetchAdminHealth,
        // a status page should not show a minute-old "up"
        staleTime: 0,
        refetchInterval: 60_000,
    });

export const useServerErrors = () =>
    useInfiniteQuery({
        queryKey: queryKeys.admin.errors,
        queryFn: ({ pageParam }) => fetchServerErrors(pageParam),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (last) => last.nextBefore ?? undefined,
    });

export const useAdminReports = (status: ReportStatus, page: number) =>
    useQuery({
        queryKey: queryKeys.admin.reports(status, page),
        queryFn: () => fetchAdminReports({ status, page }),
        placeholderData: keepPreviousData,
    });

export const useResolveReport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            input,
        }: {
            id: number;
            input: ResolveReportInput;
        }) => resolveReport(id, input),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
    });
};
