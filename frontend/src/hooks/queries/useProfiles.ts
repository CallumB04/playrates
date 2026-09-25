import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile, UpdateProfileInput } from "@playrates/shared";
import {
    deleteMyAvatar,
    fetchProfileByUsername,
    markOnboarded,
    queryKeys,
    updateMyProfile,
    uploadMyAvatar,
} from "../../api";

export const useProfile = (username: string | undefined) =>
    useQuery<Profile>({
        queryKey: queryKeys.profiles.byUsername(username ?? ""),
        queryFn: () => fetchProfileByUsername(username!),
        enabled: !!username,
    });

/** Seeds both caches so the page updates without waiting on a refetch. */
const seedProfile = (
    queryClient: ReturnType<typeof useQueryClient>,
    profile: Profile
) => {
    queryClient.setQueryData(queryKeys.profiles.me, profile);
    queryClient.setQueryData(
        queryKeys.profiles.byUsername(profile.username),
        profile
    );
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
};

/** Takes the already-compressed image, so what was previewed is what is
 *  stored. */
export const useUpdateAvatar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (image: Blob) => uploadMyAvatar(image),
        onSuccess: (profile) => seedProfile(queryClient, profile),
    });
};

export const useRemoveAvatar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteMyAvatar,
        onSuccess: (profile) => seedProfile(queryClient, profile),
    });
};

export const useMarkOnboarded = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markOnboarded,
        onSuccess: (profile) => seedProfile(queryClient, profile),
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
        onSuccess: (profile) => seedProfile(queryClient, profile),
    });
};
