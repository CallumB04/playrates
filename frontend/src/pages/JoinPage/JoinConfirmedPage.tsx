import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, MailWarning } from "lucide-react";
import type { MyProfile } from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import Button from "../../components/ui/Button";
import ProfilePicture from "../../components/ProfilePicture";
import { buttonClass } from "../../components/ui/buttonClass";
import Skeleton, { TextSkeleton } from "../../components/ui/Skeleton";
import FormField from "../../components/auth/FormField";
import CheckInbox from "../../components/auth/CheckInbox";
import { useCaptcha } from "../../components/auth/useCaptcha";
import SwitchLink from "./components/SwitchLink";
import StepHeading from "./components/StepHeading";

/** A round mark over a step that went wrong. */
const ProblemMark = ({ children }: { children: ReactNode }) => (
    <span
        aria-hidden
        className="mb-5 grid size-14 place-items-center rounded-full bg-warning-subtle text-warning"
    >
        {children}
    </span>
);

const LogIn = () => <SwitchLink to="/login">Log in</SwitchLink>;

/** Confirmed and signed in: who you are now, and one way on. */
const Confirmed = ({ user }: { user: MyProfile }) => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col">
            <span className="relative mb-6 self-start">
                <ProfilePicture
                    variant="review"
                    file={user.avatarUrl ?? ""}
                    username={user.username}
                    accent={user.accent}
                    link={false}
                />
                <span
                    aria-hidden
                    className="absolute -right-1.5 -bottom-1.5 grid size-7 animate-confirm place-items-center rounded-full bg-success text-content-on-solid ring-4 ring-surface"
                >
                    <Check size={15} strokeWidth={3} />
                </span>
            </span>
            <StepHeading
                title={`You’re in, ${user.firstName || user.username}`}
                aside="Your email’s confirmed. Next, add a picture and the games you’ve played, or skip either for now."
            />
            <Button
                size="lg"
                onClick={() => navigate("/")}
                className="mt-8 w-full"
            >
                Get started
            </Button>
            <Link
                to="/library"
                className="relative mt-4 self-center text-body-sm font-medium text-content-secondary before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:text-content"
            >
                Browse the library first
            </Link>
        </div>
    );
};

/** The link ran out, was used, or didn't work: a new one, right here. */
const Problem = ({ expired }: { expired: boolean }) => {
    const { resendConfirmation } = useAuth();
    const notify = useNotify();
    const captcha = useCaptcha();
    const navigate = useNavigate();
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [error, setError] = useState<string>();

    if (sentTo) {
        return (
            <div className="flex flex-col">
                <StepHeading title="Check your inbox" centred />
                <div className="mt-6">
                    <CheckInbox
                        email={sentTo}
                        justSent
                        onStartAgain={() => navigate("/join")}
                    />
                </div>
            </div>
        );
    }

    const send = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const email = String(
            new FormData(event.currentTarget).get("email") ?? ""
        ).trim();
        if (!email.includes("@")) {
            setError("Enter the email you signed up with.");
            return;
        }
        setError(undefined);
        setSending(true);
        const captchaToken = await captcha.getToken();
        if (captchaToken === null) {
            setSending(false);
            return;
        }
        try {
            await resendConfirmation(email, captchaToken);
            setSentTo(email);
        } catch (err) {
            captcha.reset();
            if (captcha.handled(err)) return;
            notify("Couldn’t send it. Try again in a minute.", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col">
            <ProblemMark>
                <MailWarning size={24} />
            </ProblemMark>
            <StepHeading
                title={
                    expired ? "That link has run out" : "That link didn’t work"
                }
                aside={
                    expired
                        ? "Links last an hour and work once. Send yourself a new one."
                        : "Send yourself a new one, and use the newest link."
                }
            />
            <form
                onSubmit={(event) => void send(event)}
                className="mt-6 flex flex-col gap-3"
            >
                <FormField
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    error={error}
                />
                {captcha.field}
                <Button type="submit" size="lg" disabled={sending}>
                    {sending ? "Sending…" : "Send a new link"}
                </Button>
            </form>
            <p className="mt-4 text-center text-body-sm text-content-secondary">
                Confirmed it already? <LogIn />
            </p>
        </div>
    );
};

/** Here without a link, and not signed in. */
const NothingHere = () => (
    <div className="flex flex-col">
        <StepHeading
            title="Nothing to confirm"
            aside="This is where the link in your confirmation email lands."
        />
        <div className="mt-8 flex flex-col gap-2">
            <Link to="/join" className={buttonClass("primary", "w-full", "lg")}>
                Create an account
            </Link>
        </div>
        <p className="mt-4 text-center text-body-sm text-content-secondary">
            Already have one? <LogIn />
        </p>
    </div>
);

/**
 * Where the link in a confirmation email ends up: signed in and welcomed,
 * or, if the link ran out or failed, a new one sent from right here.
 */
const JoinConfirmedPage = () => {
    usePageMeta({ title: "Email confirmed", noindex: true });
    const [params] = useSearchParams();
    const { user, isLoading } = useAuth();
    const link = params.get("link");

    return (
        <>
            {link === "expired" || link === "failed" ? (
                <Problem expired={link === "expired"} />
            ) : isLoading ? (
                <div aria-busy className="flex flex-col">
                    <Skeleton round className="mb-5 size-14" />
                    <Skeleton className="h-8 w-3/4" />
                    <div className="mt-3">
                        <TextSkeleton lines={2} />
                    </div>
                </div>
            ) : user ? (
                <Confirmed user={user} />
            ) : (
                <NothingHere />
            )}
        </>
    );
};

export default JoinConfirmedPage;
