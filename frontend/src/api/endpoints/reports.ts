import type {
    AdminReport,
    AdminReportsQuery,
    CreateReportInput,
    Paginated,
    ResolveReportInput,
} from "@playrates/shared";
import { api } from "../client";

export const createReport = async (input: CreateReportInput): Promise<void> => {
    await api.post("/reports", input);
};

export const fetchAdminReports = async (
    query: Partial<AdminReportsQuery>
): Promise<Paginated<AdminReport>> => {
    const { data } = await api.get<Paginated<AdminReport>>("/admin/reports", {
        params: query,
    });
    return data;
};

export const resolveReport = async (
    id: number,
    input: ResolveReportInput
): Promise<AdminReport> => {
    const { data } = await api.patch<AdminReport>(
        `/admin/reports/${id}`,
        input
    );
    return data;
};
