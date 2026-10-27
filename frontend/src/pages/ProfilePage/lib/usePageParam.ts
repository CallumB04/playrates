import { useSearchParams } from "react-router-dom";

/** A list's page, kept in the URL so a reload or a shared link lands on it. */
export const usePageParam = () => {
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);

    const setPage = (next: number) => {
        const updated = new URLSearchParams(params);
        if (next > 1) updated.set("page", String(next));
        else updated.delete("page");
        setParams(updated);
    };

    return [page, setPage] as const;
};
