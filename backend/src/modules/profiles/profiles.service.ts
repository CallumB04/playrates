import type {
  MyProfile,
  Paginated,
  Pagination,
  Profile,
  UpdateProfileInput,
} from "@playrates/shared";
import { AVATAR_MAX_BYTES, isWebp } from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { AuthAdmin } from "../../config/authAdmin.js";
import type { AvatarStore } from "../../config/avatarStore.js";
import type { ProfilesRepository } from "./profiles.repository.js";
import { toMyProfile, toProfile } from "./profiles.mapper.js";

export const createProfilesService = (
  repo: ProfilesRepository,
  authAdmin: AuthAdmin,
  avatars: AvatarStore,
) => ({
  /** The caller's own, so it carries their settings. */
  async getById(id: string): Promise<MyProfile> {
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Profile");
    return toMyProfile(row);
  },

  /**
   * Closes an account for good. Deletes the auth user, not the profile — the
   * foreign key runs from profiles to auth.users, so going this way cascades
   * through to the logs, reviews and friendships.
   */
  async deleteOwn(id: string): Promise<void> {
    // 404 rather than a silent success if it is already gone.
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Profile");
    await authAdmin.deleteUser(id);
  },

  /**
   * Replaces the caller's profile picture. The browser crops and compresses
   * before it gets here, so anything that is not already a small WebP has
   * come from somewhere other than our own uploader and is refused rather
   * than re-encoded.
   */
  async setAvatar(callerId: string, bytes: Buffer): Promise<MyProfile> {
    if (bytes.length === 0) throw AppError.badRequest("No image was uploaded");
    if (bytes.length > AVATAR_MAX_BYTES) {
      throw AppError.badRequest("That picture is too large");
    }
    if (!isWebp(bytes)) {
      throw AppError.badRequest("A profile picture must be a WebP image");
    }

    const url = await avatars.put(callerId, bytes);
    return toMyProfile(await repo.update(callerId, { avatar_url: url }));
  },

  /** Back to the generated one. */
  async clearAvatar(callerId: string): Promise<MyProfile> {
    await avatars.remove(callerId);
    return toMyProfile(await repo.update(callerId, { avatar_url: null }));
  },

  async getByUsername(username: string): Promise<Profile> {
    const row = await repo.findByUsername(username);
    if (!row) throw AppError.notFound("Profile");
    return toProfile(row);
  },

  async search(
    query: string | undefined,
    pagination: Pagination,
  ): Promise<Paginated<Profile>> {
    const { from, to } = toRange(pagination);
    const { rows, total } = await repo.search(query, from, to);
    return paginate(
      rows.map((r) => toProfile(r)),
      pagination,
      total,
    );
  },

  async isUsernameAvailable(
    username: string,
    excludingId?: string,
  ): Promise<boolean> {
    return !(await repo.usernameExists(username, excludingId));
  },

  /** Built explicitly rather than spread from the body, so only these fields
   *  can ever be written. */
  async updateOwn(
    callerId: string,
    input: UpdateProfileInput,
  ): Promise<Profile> {
    if (input.username !== undefined) {
      const taken = await repo.usernameExists(input.username, callerId);
      if (taken) {
        throw AppError.conflict(
          "username_taken",
          "That username is already taken",
        );
      }
    }

    const patch: Record<string, unknown> = {};
    if (input.username !== undefined) patch.username = input.username;
    if (input.bio !== undefined) patch.bio = input.bio;
    if (input.showSexualContent !== undefined) {
      patch.show_sexual_content = input.showSexualContent;
    }
    if (input.firstName !== undefined) {
      // An empty string is a clear, not a name.
      patch.first_name = input.firstName || null;
    }
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.hideOnline !== undefined) patch.hide_online = input.hideOnline;
    // Null is a choice: it puts the username's colour back.
    if (input.accent !== undefined) patch.accent = input.accent;

    if (Object.keys(patch).length === 0) {
      return this.getById(callerId);
    }

    return toMyProfile(await repo.update(callerId, patch));
  },

  async heartbeat(callerId: string): Promise<void> {
    await repo.touchLastSeen(callerId);
  },
});

export type ProfilesService = ReturnType<typeof createProfilesService>;
