import type {
  Paginated,
  Pagination,
  Profile,
  UpdateProfileInput,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { AuthAdmin } from "../../config/authAdmin.js";
import type { ProfilesRepository } from "./profiles.repository.js";
import { toProfile } from "./profiles.mapper.js";

export const createProfilesService = (
  repo: ProfilesRepository,
  authAdmin: AuthAdmin,
) => ({
  async getById(id: string): Promise<Profile> {
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Profile");
    return toProfile(row);
  },

  /**
   * Closes an account for good.
   *
   * Deletes the auth user, not the profile. The foreign key runs from
   * profiles to auth.users, so removing the profile alone would leave a
   * sign-in that can never get a profile back. Going the other way cascades
   * through profiles to the user's logs, reviews and friendships.
   */
  async deleteOwn(id: string): Promise<void> {
    // 404 rather than a silent success if it is already gone.
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Profile");
    await authAdmin.deleteUser(id);
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

  /**
   * Builds the patch explicitly rather than spreading the request body, so
   * only these three fields can ever be written.
   */
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
    if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
    if (input.showSexualContent !== undefined) {
      patch.show_sexual_content = input.showSexualContent;
    }

    if (Object.keys(patch).length === 0) {
      return this.getById(callerId);
    }

    return toProfile(await repo.update(callerId, patch));
  },

  async heartbeat(callerId: string): Promise<void> {
    await repo.touchLastSeen(callerId);
  },
});

export type ProfilesService = ReturnType<typeof createProfilesService>;
