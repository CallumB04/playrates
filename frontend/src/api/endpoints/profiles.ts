import type {
    MyProfile,
    Paginated,
    Profile,
    UpdateProfileInput,
} from "@playrates/shared";
import { AVATAR_MIME } from "@playrates/shared";
import { api } from "../client";

export const fetchMyProfile = async (): Promise<MyProfile> => {
    const { data } = await api.get<MyProfile>("/profiles/me");
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

/** The compressed WebP itself, as the body. The API stores it and returns
 *  the profile carrying its new URL. */
export const uploadMyAvatar = async (image: Blob): Promise<MyProfile> => {
    const { data } = await api.post<MyProfile>("/profiles/me/avatar", image, {
        headers: { "Content-Type": AVATAR_MIME },
    });
    return data;
};

/** Back to the generated one. */
export const deleteMyAvatar = async (): Promise<MyProfile> => {
    const { data } = await api.delete<MyProfile>("/profiles/me/avatar");
    return data;
};

/** Pushes last_seen_at forward. Nothing else writes it. */
/** The first-login welcome has been seen, and should not show again. */
export const markOnboarded = async (): Promise<MyProfile> => {
    const { data } = await api.post<MyProfile>("/profiles/me/onboarded");
    return data;
};

export const sendHeartbeat = async (): Promise<void> => {
    await api.post("/profiles/me/heartbeat");
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
