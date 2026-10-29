import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { sendReferral } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
    captureReferral,
    clearReferral,
    pendingReferral,
} from "../../lib/referral";

const FIRST_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Notes an invite from any page's `?ref=`, and once its visitor has an
 * account, says who invited them. Only a new account's: the API refuses
 * the rest, and an old one has nothing to claim.
 */
const ReferralCapture = () => {
    const { search } = useLocation();
    const { user } = useAuth();

    useEffect(() => captureReferral(search), [search]);

    useEffect(() => {
        if (!user) return;
        const ref = pendingReferral();
        if (!ref) return;
        const isNew = Date.now() - Date.parse(user.createdAt) < FIRST_WEEK_MS;
        if (ref.toLowerCase() === user.username.toLowerCase() || !isNew) {
            clearReferral();
            return;
        }
        // Either way it's settled: a refusal won't turn into an acceptance.
        sendReferral(ref)
            .catch(() => undefined)
            .finally(clearReferral);
    }, [user]);

    return null;
};

export default ReferralCapture;
