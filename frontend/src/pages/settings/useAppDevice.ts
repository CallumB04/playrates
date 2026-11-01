import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPushKey } from "../../api";
import { install, isInstalled, useInstallOffer } from "../../lib/installPrompt";
import {
    pushSubscription,
    pushSupported,
    turnOffPush,
    turnOnPush,
} from "../../lib/pushDevice";

export type PushState =
    | "checking"
    /** Not set up on the server: nothing to offer. */
    | "unavailable"
    /** An iPhone or iPad in Safari: pushes come only to the installed app. */
    | "install-first"
    | "unsupported"
    | "blocked"
    | "off"
    | "on";

export const isAppleMobile = (userAgent: string, touchPoints: number) =>
    /iPhone|iPad|iPod/.test(userAgent) ||
    // iPadOS asks for desktop pages and says it's a Mac.
    (/Macintosh/.test(userAgent) && touchPoints > 1);

/** Where pushes stand on this device, before asking whether it's on. */
export const pushStateFor = ({
    key,
    supported,
    appleMobile,
    installed,
    permission,
}: {
    key: string | null | undefined;
    supported: boolean;
    appleMobile: boolean;
    installed: boolean;
    permission: NotificationPermission | null;
}): PushState | "ask" => {
    if (key === undefined) return "checking";
    if (key === null) return "unavailable";
    if (appleMobile && !installed) return "install-first";
    if (!supported) return "unsupported";
    if (permission === "denied") return "blocked";
    return "ask";
};

/** Installing PlayRates, and pushes to this device. */
export const useAppDevice = () => {
    const offer = useInstallOffer();
    const installed = isInstalled();
    const appleMobile = isAppleMobile(
        navigator.userAgent,
        navigator.maxTouchPoints ?? 0
    );
    const { data: key } = useQuery({
        queryKey: ["push", "key"],
        queryFn: fetchPushKey,
        staleTime: Infinity,
    });

    const [push, setPush] = useState<PushState>("checking");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const base = pushStateFor({
            key,
            supported: pushSupported(),
            appleMobile,
            installed,
            permission: pushSupported() ? Notification.permission : null,
        });
        if (base !== "ask") {
            setPush(base);
            return;
        }
        let live = true;
        pushSubscription()
            .then((s) => live && setPush(s ? "on" : "off"))
            .catch(() => live && setPush("unsupported"));
        return () => {
            live = false;
        };
    }, [key, appleMobile, installed]);

    const turnOn = useCallback(async () => {
        if (!key) return;
        setBusy(true);
        try {
            const answer = await turnOnPush(key);
            setPush(
                answer === "granted"
                    ? "on"
                    : answer === "denied"
                      ? "blocked"
                      : "off"
            );
        } finally {
            setBusy(false);
        }
    }, [key]);

    const turnOff = useCallback(async () => {
        setBusy(true);
        try {
            await turnOffPush();
            setPush("off");
        } finally {
            setBusy(false);
        }
    }, []);

    return {
        install: { offer, installed, appleMobile, run: install },
        push: { state: push, busy, turnOn, turnOff },
    };
};
