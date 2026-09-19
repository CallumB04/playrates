import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile, UpdateProfileInput } from "@playrates/shared";
import { fetchProfileByUsername, queryKeys, updateMyProfile } from "../../api";

export const useProfile = (username: string | undefined) =>
    useQuery<Profile>({
        queryKey: queryKeys.profiles.byUsername(username ?? ""),
        queryFn: () => fetchProfileByUsername(username!),
        enabled: !!username,
    });

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
        onSuccess: (profile) => {
            // seed both caches so the page updates without a refetch, which is
            // what the old "temporary bio/username state" existed to fake
            queryClient.setQueryData(queryKeys.profiles.me, profile);
            queryClient.setQueryData(
                queryKeys.profiles.byUsername(profile.username),
                profile
            );
            queryClient.invalidateQueries({ queryKey: ["profiles"] });
        },
    });
};
