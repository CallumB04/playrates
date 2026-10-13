import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { siteHasNewerBuild } from "../lib/buildVersion";

const CHECK_EVERY_MS = 10 * 60_000;

/**
 * Once the site has a newer build than this tab, the next page change loads
 * it for real instead of rendering the old code. A change of page already
 * redraws everything, so the reload costs nothing anyone would notice; doing
 * it mid-page would throw away whatever they were typing.
 */
export const useReloadOnNewBuild = (): void => {
    const stale = useRef(false);
    const { pathname } = useLocation();

    useEffect(() => {
        const check = async () => {
            if (!stale.current && (await siteHasNewerBuild())) {
                stale.current = true;
            }
        };
        // A tab coming back after a weekend is the one most likely behind.
        const onVisible = () => {
            if (document.visibilityState === "visible") void check();
        };
        document.addEventListener("visibilitychange", onVisible);
        const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        // The address has already changed, so a reload lands on the new page.
        if (stale.current) window.location.reload();
    }, [pathname]);
};
