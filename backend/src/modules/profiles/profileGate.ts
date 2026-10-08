import { canSeeProfile } from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { ProfileRow } from "../../types/database.types.js";
import type { FriendsRepository } from "../friends/friends.repository.js";
import type { ProfilesRepository } from "./profiles.repository.js";
import { toProfileVisibility } from "./profiles.mapper.js";

/**
 * A profile by username, if the viewer may see past its card. Every route
 * that lists someone's games, reviews, friends or threads comes through here,
 * so a new one cannot forget to ask.
 */
export type ProfileGate = (
  username: string,
  viewerId: string | undefined,
) => Promise<ProfileRow>;

export const createProfileGate =
  (profiles: ProfilesRepository, friends: FriendsRepository): ProfileGate =>
  async (username, viewerId) => {
    const profile = await profiles.findByUsername(username);
    if (!profile) throw AppError.notFound("Profile");

    const visibility = toProfileVisibility(profile.profile_visibility);
    const isOwner = profile.id === viewerId;
    // Only worth the lookup when friendship is what decides it.
    const isFriend =
      !isOwner && visibility === "friends" && viewerId !== undefined
        ? (await friends.find(profile.id, viewerId))?.status === "accepted"
        : false;

    if (!canSeeProfile(visibility, { isOwner, isFriend })) {
      throw new AppError(403, "profile_private", "This profile is private");
    }
    return profile;
  };
