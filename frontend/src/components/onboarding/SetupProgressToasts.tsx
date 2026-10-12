import { useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useSetupSteps } from "../../hooks/useSetupSteps";
import { setupMessage, type SetupStep } from "../../lib/setupChecklist";

/**
 * A toast as each Get started step is done, and one when the last is. Only
 * for a step done while the tab is open: the first look at an account is
 * where it stands, not news, so a reload says nothing.
 */
const SetupProgressToasts = () => {
    const { user } = useAuth();
    const steps = useSetupSteps();
    const notify = useNotify();
    const seen = useRef<{ userId: string; steps: SetupStep[] } | null>(null);

    useEffect(() => {
        if (!user || !steps) return;
        const before = seen.current;
        seen.current = { userId: user.id, steps };
        // Signing in as someone else is a first look too.
        if (!before || before.userId !== user.id) return;
        const message = setupMessage(before.steps, steps);
        if (message) notify(message, "success");
    }, [user, steps, notify]);

    return null;
};

export default SetupProgressToasts;
