import {
  toPlainText,
  type AdminReport,
  type AdminReportsQuery,
  type CreateReportInput,
  type Paginated,
  type ReportReason,
  type ReportStatus,
  type ReportTarget,
  type ResolveReportInput,
  type RichTextDoc,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { AvatarStore } from "../../config/avatarStore.js";
import type { ContentReportRow } from "../../types/database.types.js";
import type { CommunityRepository } from "../community/community.repository.js";
import type { CommunityService } from "../community/community.service.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { ReviewsRepository } from "../reviews/reviews.repository.js";
import type { ReportsRepository } from "./reports.repository.js";

interface Deps {
  repo: ReportsRepository;
  community: CommunityRepository;
  communityService: CommunityService;
  reviews: ReviewsRepository;
  profiles: ProfilesRepository;
  avatars: AvatarStore;
}

const EXCERPT = 140;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What a report points at, as it stands now. */
interface Target {
  authorId: string | null;
  label: string;
  href: string;
  author: string | null;
}

export const createReportsService = ({
  repo,
  community,
  communityService,
  reviews,
  profiles,
  avatars,
}: Deps) => {
  const numericId = (id: string): number | null =>
    /^\d{1,18}$/.test(id) ? Number(id) : null;

  /** Null when it does not exist, or no longer does. */
  const findTarget = async (
    type: ReportTarget,
    id: string,
  ): Promise<Target | null> => {
    if (type === "profile") {
      if (!UUID.test(id)) return null;
      const row = await profiles.findById(id);
      return row
        ? {
            authorId: row.id,
            label: row.bio ? `${row.username}: ${row.bio}` : row.username,
            href: `/user/${row.username}`,
            author: row.username,
          }
        : null;
    }

    const n = numericId(id);
    if (n === null) return null;

    if (type === "thread") {
      const row = await community.findThread(n);
      return row
        ? {
            authorId: row.author_id,
            label: row.title,
            href: `/community/thread/${row.id}`,
            author: row.author_username,
          }
        : null;
    }

    if (type === "message") {
      const row = await community.findMessage(n);
      if (!row || row.deleted_at) return null;
      return {
        authorId: row.author_id,
        label: toPlainText(row.body as RichTextDoc).slice(0, EXCERPT),
        href: `/community/thread/${row.thread_id}#message-${row.id}`,
        author: row.author_username,
      };
    }

    const row = await reviews.findById(n);
    return row
      ? {
          authorId: row.user_id,
          label: row.body.slice(0, EXCERPT),
          href: `/game/${row.game_id}#review-${row.id}`,
          author: row.author_username,
        }
      : null;
  };

  const toAdminReport = async (row: ContentReportRow): Promise<AdminReport> => {
    const type = row.target_type as ReportTarget;
    const [target, reporter, sameTarget] = await Promise.all([
      findTarget(type, row.target_id),
      row.reporter_id ? profiles.findById(row.reporter_id) : null,
      repo.countOpenFor(type, row.target_id),
    ]);
    return {
      id: row.id,
      targetType: type,
      targetId: row.target_id,
      reason: row.reason as ReportReason,
      details: row.details,
      status: row.status as ReportStatus,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      reporter: reporter ? { username: reporter.username } : null,
      target: target
        ? { label: target.label, href: target.href, author: target.author }
        : null,
      otherReports: Math.max(0, sameTarget - (row.status === "open" ? 1 : 0)),
    };
  };

  /** Takes the reported thing down, the way its own delete would. */
  const remove = async (adminId: string, type: ReportTarget, id: string) => {
    if (type === "thread") {
      await communityService.deleteThread(adminId, Number(id));
    } else if (type === "message") {
      await communityService.deleteMessage(adminId, Number(id));
    } else if (type === "review") {
      await reviews.remove(Number(id));
    } else {
      // A profile is not removed, only emptied of what can be offensive.
      // Closing the account is a bigger step, taken by hand.
      await avatars.remove(id);
      await profiles.update(id, { bio: "", avatar_url: null });
    }
  };

  return {
    async create(userId: string, input: CreateReportInput): Promise<void> {
      const target = await findTarget(input.targetType, input.targetId);
      if (!target) throw AppError.notFound("That post");
      if (target.authorId === userId) {
        throw AppError.validation("You can't report your own post");
      }
      if (await repo.findOpen(userId, input.targetType, input.targetId)) {
        throw AppError.conflict(
          "already_reported",
          "You've already reported this",
        );
      }
      await repo.create({
        reporter_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details || null,
      });
    },

    async list(query: AdminReportsQuery): Promise<Paginated<AdminReport>> {
      const { from, to } = toRange(query);
      const { rows, total } = await repo.list(query.status, from, to);
      return paginate(await Promise.all(rows.map(toAdminReport)), query, total);
    },

    async resolve(
      adminId: string,
      reportId: number,
      input: ResolveReportInput,
    ): Promise<AdminReport> {
      const report = await repo.findById(reportId);
      if (!report) throw AppError.notFound("Report");
      const type = report.target_type as ReportTarget;

      if (input.status === "resolved" && input.removeContent) {
        if (await findTarget(type, report.target_id)) {
          await remove(adminId, type, report.target_id);
        }
        // Gone, so every report about it has been dealt with.
        await repo.closeOpenFor(type, report.target_id, "resolved", adminId);
      } else {
        await repo.close(report.id, input.status, adminId);
      }

      return toAdminReport((await repo.findById(reportId))!);
    },
  };
};

export type ReportsService = ReturnType<typeof createReportsService>;
