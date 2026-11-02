import { useQuery } from "@tanstack/react-query";
import { fetchSteamAvailable } from "../../api";

/** Whether the Steam import is switched on for this visitor. Signed out,
 *  the API says no by refusing, which reads as off. */
export const useSteamAvailable = (): boolean =>
    useQuery({
        queryKey: ["steam", "available"],
        queryFn: fetchSteamAvailable,
        staleTime: Infinity,
        retry: false,
    }).data === true;
