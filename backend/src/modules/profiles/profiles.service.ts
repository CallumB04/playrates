import type {
  Paginated,
  Pagination,
  Profile,
  UpdateProfileInput,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { ProfilesRepository } from "./profiles.repository.js";
import { toProfile } from "./profiles.mapper.js";

export const createProfilesService = (repo: ProfilesRepository) => ({
  async getById(id: string): Promise<Profile> {
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Profile");
    return toProfile(row);
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
   * Only the three editable fields are ever written. The old handler spread
   * the whole request body over the stored record, so a caller could set
   * their own id, email or password.
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
    if (input.pictureUrl !== undefined) patch.picture_url = input.pictureUrl;

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
