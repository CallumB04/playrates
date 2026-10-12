import type {
  MyProfile,
  Paginated,
  Pagination,
  Profile,
  UpdateProfileInput,
} from "@playrates/shared";
import { AVATAR_MAX_BYTES, AVATAR_PIXELS } from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { cleanUpload } from "../../lib/cleanUpload.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { AuthAdmin } from "../../config/authAdmin.js";
import type { AvatarStore } from "../../config/avatarStore.js";
import type { ProfilesRepository } from "./profiles.repository.js";
import type {
  AccountData,
  AccountExportRepository,
} from "./accountExport.repository.js";
import { toMyProfile, toProfile } from "./profiles.mapper.js";

export interface AccountExport extends AccountData {
  exportedAt: string;
  email: string | null;
}

export const createProfilesService = (
  repo: ProfilesRepository,
  authAdmin: AuthAdmin,
  avatars: AvatarStore,
  exports: AccountExportRepository,
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
    // First, so a storage failure stops here with the account still whole
    // and the request safe to retry.
    if (row.avatar_url) await avatars.remove(id);
    await authAdmin.deleteUser(id);
    await repo.eraseTraces(id);
  },

  /** A copy of everything held about the caller, for them to keep. */
  async exportOwn(id: string): Promise<AccountExport> {
    const [data, email] = await Promise.all([
      exports.collect(id),
      authAdmin.getEmail(id),
    ]);
    if (!data.profile) throw AppError.notFound("Profile");
    return { exportedAt: new Date().toISOString(), email, ...data };
  },

  /**
   * Replaces the caller's profile picture. The browser crops and compresses
   * before it gets here, so anything that is not already a small WebP or
   * JPEG has come from somewhere other than our own uploader and is refused.
   * What passes is re-encoded to WebP, so only decoded pixels are stored.
   */
  async setAvatar(callerId: string, bytes: Buffer): Promise<MyProfile> {
    if (bytes.length === 0) throw AppError.badRequest("No image was uploaded");
    if (bytes.length > AVATAR_MAX_BYTES) {
      throw AppError.badRequest("That picture is too large");
    }
    const clean = await cleanUpload(bytes, {
      maxEdge: AVATAR_PIXELS,
      maxBytes: AVATAR_MAX_BYTES,
    });
    const url = await avatars.put(callerId, clean);
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
    if (input.hideFromSearch !== undefined) {
      patch.hide_from_search = input.hideFromSearch;
    }
    if (input.profileVisibility !== undefined) {
      patch.profile_visibility = input.profileVisibility;
    }
    if (input.accent !== undefined) patch.accent = input.accent;

    if (Object.keys(patch).length === 0) {
      return this.getById(callerId);
    }

    return toMyProfile(await repo.update(callerId, patch));
  },

  /** The first-login welcome has been seen. Keeps the first time it was, so a
   *  second tab closing its copy does not move the date. */
  async markOnboarded(callerId: string): Promise<MyProfile> {
    const row = await repo.findById(callerId);
    if (!row) throw AppError.notFound("Profile");
    if (row.onboarded_at) return toMyProfile(row);
    return toMyProfile(
      await repo.update(callerId, { onboarded_at: new Date().toISOString() }),
    );
  },

  async heartbeat(callerId: string): Promise<void> {
    await repo.touchLastSeen(callerId);
  },
});

export type ProfilesService = ReturnType<typeof createProfilesService>;
