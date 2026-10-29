import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Grid3x3, Share2 } from "lucide-react";
import {
    GAMING_25_SIZE,
    type Gaming25,
    type Gaming25Category,
} from "@playrates/shared";
import NotFoundPage from "../NotFoundPage";
import { ApiError, gaming25ImageUrl } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useGaming25, useGaming25Love } from "../../hooks/queries/useGaming25";
import { usePageMeta } from "../../hooks/usePageMeta";
import Button, { buttonClass } from "../../components/ui/Button";
import LoveButton from "../../components/ui/LoveButton";
import EmptyPlate from "../../components/ui/EmptyPlate";
import { Skeleton } from "../../components/ui/Skeleton";
import { cardClass } from "../../components/ui/Card";
import ProfilePicture from "../../components/ProfilePicture";
import Gaming25Grid from "../../components/gaming25/Gaming25Grid";
import Gaming25PickSheet from "../../components/gaming25/Gaming25PickSheet";
import ShareSheet from "../../components/share/ShareSheet";
import { gaming25Path, profilePath } from "../../lib/profilePaths";
import { whyCannotLove } from "../../lib/voting";

const statusOf = (error: unknown) =>
    error instanceof ApiError ? error.status : undefined;

/** Someone's Gaming 25: theirs to fill in, everyone else's to love. */
const Gaming25Page = () => {
    const { username = "" } = useParams();
    const { data: grid, isLoading, error } = useGaming25(username);

    usePageMeta({
        title: `${username}'s Gaming 25`,
        noindex: !grid || grid.picks.length === 0,
    });

    if (statusOf(error) === 404) return <NotFoundPage />;
    if (statusOf(error) === 403) {
        return (
            <EmptyPlate
                title={`${username}'s Gaming 25 is private`}
                body="It's only for the people who can see their profile."
            />
        );
    }
    if (isLoading || !grid) return <Gaming25Skeleton />;
    return <LoadedGaming25 grid={grid} />;
};

type Sharing = "share" | "done" | null;

const LoadedGaming25 = ({ grid }: { grid: Gaming25 }) => {
    const { user } = useAuth();
    const { openSignup } = useAccountForm();
    const username = grid.owner.username;
    const isOwner = user?.username === username;
    const love = useGaming25Love(username);
    const [picking, setPicking] = useState<Gaming25Category | null>(null);
    const [sharing, setSharing] = useState<Sharing>(null);
    // Whether the viewer has one of their own, to offer them one if not.
    const { data: mine } = useGaming25(
        user?.username ?? "",
        !!user && !isOwner
    );

    const count = grid.picks.length;
    const empty = count === 0;
    // Shared with the sharer's invite on it: "what would yours be?" is the
    // page most likely to bring someone new.
    const url = `${window.location.origin}${gaming25Path(username)}${
        user ? `?ref=${encodeURIComponent(user.username)}` : ""
    }`;

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            <Link
                to={profilePath(username)}
                className="-mb-1 inline-flex min-h-11 w-max items-center gap-1.5 text-label font-medium text-content-secondary hover:text-content sm:-mb-2 sm:min-h-0"
            >
                <ArrowLeft size={15} aria-hidden />
                {isOwner ? "Your profile" : `${username}’s profile`}
            </Link>
            <header
                className={cardClass(
                    "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6",
                    { padding: "none" }
                )}
            >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <ProfilePicture
                        variant="friendRowLarge"
                        file={grid.owner.avatarUrl ?? ""}
                        username={username}
                        accent={grid.owner.accent}
                        link
                    />
                    <div className="min-w-0">
                        <p className="text-label-sm text-content-muted">
                            <Link
                                to={profilePath(username)}
                                className="font-medium text-content hover:text-brand"
                            >
                                {username}
                            </Link>
                            ’s
                        </p>
                        <h1 className="font-display text-[26px] leading-tight font-semibold text-content sm:text-[34px]">
                            Gaming 25
                        </h1>
                        <p className="mt-0.5 font-mono text-label-sm text-content-muted">
                            {count} of {GAMING_25_SIZE} picked
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <LoveButton
                        count={grid.loveCount}
                        loved={grid.lovedByViewer}
                        disabledReason={whyCannotLove(user?.username, username)}
                        onJoin={user ? undefined : openSignup}
                        onToggle={() => love.mutateAsync()}
                        className="max-sm:flex-1 max-sm:justify-center"
                    />
                    {!empty && (
                        <Button
                            size="touch"
                            onClick={() => setSharing("share")}
                            className="max-sm:flex-1"
                        >
                            <Share2 size={16} aria-hidden />
                            Share
                        </Button>
                    )}
                </div>
            </header>

            {isOwner && empty && (
                <p className="rounded-lg border border-dashed border-strong bg-surface-sunken/40 p-3 text-body-sm text-content-secondary sm:p-4">
                    Pick a game for each category. Start anywhere and each pick
                    takes you on to the next.
                </p>
            )}

            <section className={cardClass("p-2.5 sm:p-6", { padding: "none" })}>
                {/* Held narrow enough to take in at once: one picture,
                    not 25 posters. */}
                <Gaming25Grid
                    picks={grid.picks}
                    onPick={isOwner ? setPicking : undefined}
                    className="mx-auto max-w-[660px]"
                />
            </section>

            {!isOwner && (!user || (mine && mine.picks.length === 0)) && (
                <MakeYourOwn
                    signedIn={!!user}
                    username={user?.username}
                    onSignup={openSignup}
                />
            )}

            {picking && (
                <Gaming25PickSheet
                    grid={grid}
                    start={picking}
                    onClose={() => setPicking(null)}
                    onComplete={() => {
                        setPicking(null);
                        setSharing("done");
                    }}
                />
            )}
            {sharing && (
                <ShareSheet
                    title={
                        sharing === "done"
                            ? "Your Gaming 25 is done"
                            : `Share ${isOwner ? "your" : `${username}’s`} Gaming 25`
                    }
                    lede={
                        sharing === "done"
                            ? "All 25 picked. Put it out there and see who agrees."
                            : undefined
                    }
                    url={url}
                    text={
                        isOwner
                            ? "My Gaming 25 on PlayRates. What would yours be?"
                            : `${username}'s Gaming 25 on PlayRates`
                    }
                    imageUrl={gaming25ImageUrl(
                        username,
                        grid.updatedAt,
                        "portrait",
                        grid.owner.cardTheme
                    )}
                    fileName={`${username}-gaming-25.png`}
                    noImage="Pictures are made only for profiles everyone can see."
                    onClose={() => setSharing(null)}
                />
            )}
        </div>
    );
};

/** The way in for someone who came by a shared grid: the reason it travels. */
const MakeYourOwn = ({
    signedIn,
    username,
    onSignup,
}: {
    signedIn: boolean;
    username?: string;
    onSignup: () => void;
}) => (
    <section
        className={cardClass(
            "flex flex-col items-start gap-3 sm:flex-row sm:items-center",
            { tone: "feature" }
        )}
    >
        <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-raised text-brand shadow-lip"
        >
            <Grid3x3 size={20} />
        </span>
        <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-content">
                What would yours be?
            </h2>
            <p className="text-body-sm text-content-secondary">
                25 categories, one game each, from the whole PlayRates library.
            </p>
        </div>
        {signedIn && username ? (
            <Link
                to={gaming25Path(username)}
                className={buttonClass("primary", "w-full sm:w-auto", "touch")}
            >
                Make your Gaming 25
                <ArrowRight size={16} aria-hidden />
            </Link>
        ) : (
            <Button
                size="touch"
                onClick={onSignup}
                className="w-full sm:w-auto"
            >
                Sign up and make yours
                <ArrowRight size={16} aria-hidden />
            </Button>
        )}
    </section>
);

const Gaming25Skeleton = () => (
    <div className="flex flex-col gap-6">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="aspect-square rounded-lg sm:aspect-5/4" />
    </div>
);

export default Gaming25Page;
