import type { Paginated, Profile, UpdateProfileInput } from "@playrates/shared";
import { api } from "../client";

export const fetchMyProfile = async (): Promise<Profile> => {
    const { data } = await api.get<Profile>("/profiles/me");
    return data;
};

export const fetchProfileByUsername = async (
    username: string
): Promise<Profile> => {
    const { data } = await api.get<Profile>(`/profiles/${username}`);
    return data;
};

export const searchProfiles = async (
    search: string
): Promise<Paginated<Profile>> => {
    const { data } = await api.get<Paginated<Profile>>("/profiles", {
        params: { search },
    });
    return data;
};

export const updateMyProfile = async (
    input: UpdateProfileInput
): Promise<Profile> => {
    const { data } = await api.patch<Profile>("/profiles/me", input);
    return data;
};

/** Irreversible. Cascades to every log, review and friendship. */
export const deleteMyAccount = async (): Promise<void> => {
    await api.delete("/profiles/me");
};

export const checkUsernameAvailable = async (
    username: string
): Promise<boolean> => {
    const { data } = await api.get<{ available: boolean }>(
        "/profiles/check-username",
        { params: { username } }
    );
    return data.available;
};
