import { useSearchParams } from "react-router-dom";

/**
 * A picker a link can open, by `?edit=<name>`: a gifted slot's notification
 * sends one. It stays in the URL while the picker is open and goes when it
 * closes, from the close itself rather than an effect, so opening it never
 * navigates.
 */
export const useEditParam = (name: string) => {
    const [params, setParams] = useSearchParams();
    const asked = params.get("edit") === name;
    const done = () => {
        if (!asked) return;
        const next = new URLSearchParams(params);
        next.delete("edit");
        setParams(next, { replace: true });
    };
    return [asked, done] as const;
};
