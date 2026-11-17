import { useMemo, useState } from "react";
import { ArrowUp, Trophy } from "lucide-react";
import type {
    AwardCategory,
    AwardLeaderboard,
    AwardPicks,
    AwardsDetail,
    EventDetail,
} from "@playrates/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { useAccountForm } from "../../../contexts/AccountFormContext";
import {
    useAwardLeaderboard,
    useMyPicks,
    useSetPick,
} from "../../../hooks/queries/useEvents";
import { usePlatforms } from "../../../hooks/queries/useGames";
import { useMyGameLogIds } from "../../../hooks/queries/useGameLogs";
import { useTileActions } from "../../../components/game/useTileActions";
import Button from "../../../components/ui/Button";
import ShareBar from "../../../components/events/ShareBar";
import { cardClass } from "../../../components/ui/cardClass";
import { cn } from "../../../lib/cn";
import { formatCount, formatOrdinal } from "../../../lib/format";
import {
    awaitingNominees,
    awardsLine,
    categoryAnchor,
    groupCategories,
    headlineOf,
    loggedOf,
    nomineeGameIds,
    pickedCount,
    pickShare,
    score,
    showsShares,
} from "../../../lib/events";
import NomineeCard from "./NomineeCard";
import AwardsNav from "./AwardsNav";
import LeaderboardPopup from "./LeaderboardPopup";
import AwaitingNominees from "./AwaitingNominees";
import { goToTop, useActiveCategory } from "./useActiveCategory";

const GRID =
    "grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6";

const Category = ({
    category,
    slug,
    awards,
    picks,
    signedIn,
    lead,
}: {
    category: AwardCategory;
    slug: string;
    awards: AwardsDetail;
    picks: AwardPicks;
    signedIn: boolean;
    lead: boolean;
}) => {
    const { data: platforms } = usePlatforms();
    const { actionsFor, statusFor } = useTileActions();
    const { openSignup } = useAccountForm();
    const setPick = useSetPick(slug);
    const mine = picks[category.id];
    const open = awards.phase === "open";
    const shares = showsShares(awards.phase, mine !== undefined);
    const Heading = lead ? "h2" : "h3";
    const named = category.nominees.some((n) => n.label !== null && n.game);

    return (
        <section
            id={categoryAnchor(category)}
            aria-labelledby={`${categoryAnchor(category)}-name`}
            className="flex scroll-mt-40 flex-col gap-4 lg:scroll-mt-28"
        >
            <div className="flex flex-col gap-1">
                <Heading
                    id={`${categoryAnchor(category)}-name`}
                    className={cn(
                        "font-display text-content",
                        lead ? "text-display" : "text-section"
                    )}
                >
                    {category.name}
                </Heading>
                {category.blurb && (
                    <p className="max-w-[60ch] text-body-sm text-content-secondary">
                        {category.blurb}
                    </p>
                )}
            </div>
            <ul className={cn(GRID, "pt-3.5")}>
                {category.nominees.map((nominee) => (
                    <NomineeCard
                        key={nominee.id}
                        nominee={nominee}
                        platforms={platforms ?? []}
                        picked={mine === nominee.id}
                        share={shares ? pickShare(nominee, category) : null}
                        canPick={open}
                        named={named}
                        categorySlug={category.slug}
                        onPick={() =>
                            signedIn
                                ? setPick.mutate({
                                      categoryId: category.id,
                                      // A second press takes the pick back.
                                      nomineeId:
                                          mine === nominee.id
                                              ? null
                                              : nominee.id,
                                  })
                                : openSignup()
                        }
                        actions={nominee.game ? actionsFor(nominee.game) : []}
                        status={nominee.game ? statusFor(nominee.game) : null}
                    />
                ))}
            </ul>
        </section>
    );
};

/** A section's heading: as big as the page's own, so it reads as a chapter
 *  over the awards in it, which are smaller and plain. */
const SectionHeading = ({ name }: { name: string }) => (
    <header>
        <h2 className="font-display text-display text-content">{name}</h2>
    </header>
);

/** Where you're up to: picks made, nominees logged, and once the winners
 *  are in, how many you called. */
const Standing = ({
    awards,
    picks,
    signedIn,
    board,
}: {
    awards: AwardsDetail;
    picks: AwardPicks;
    signedIn: boolean;
    /** Once winners are in: everyone's scores, behind a button. */
    board: AwardLeaderboard | undefined;
}) => {
    const { openSignup } = useAccountForm();
    const [boardOpen, setBoardOpen] = useState(false);
    const hasBoard = !!board && board.tiers.length > 0;
    const boardButton = hasBoard && (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => setBoardOpen(true)}
            className="shrink-0 self-start sm:self-auto"
        >
            <Trophy size={14} aria-hidden />
            Leaderboard
        </Button>
    );
    const boardPopup = boardOpen && board && (
        <LeaderboardPopup board={board} onClose={() => setBoardOpen(false)} />
    );
    const { data: logIds } = useMyGameLogIds();
    const logged = useMemo(
        () => new Set((logIds ?? []).map((log) => log.gameId)),
        [logIds]
    );

    if (!signedIn) {
        return (
            <div
                className={cardClass(
                    "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                    { tone: "accent" }
                )}
            >
                <div>
                    <p className="text-body-sm font-semibold text-content">
                        {awardsLine(awards)}
                    </p>
                    <p className="text-body-sm text-content-secondary">
                        {awards.phase === "open"
                            ? "Pick who you think wins each award, and see how everyone else is calling it."
                            : "Log the nominees you’ve played, and see how everyone called it."}
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {boardButton}
                    <Button className="w-full sm:w-auto" onClick={openSignup}>
                        {awards.phase === "open"
                            ? "Join to make your picks"
                            : "Join PlayRates"}
                    </Button>
                </div>
                {boardPopup}
            </div>
        );
    }

    const headline = headlineOf(awards.categories);
    const headlineGames = loggedOf(
        nomineeGameIds(headline ? [headline] : []),
        logged
    );
    const allGames = loggedOf(nomineeGameIds(awards.categories), logged);
    const made = pickedCount(awards.categories, picks);
    const result = score(awards.categories, picks);
    const results = awards.phase === "results";

    const figures = [
        {
            label: results ? "You called" : "Your picks",
            part: results ? result.called : made.picked,
            whole: results ? result.decided : made.total,
            // Where that puts you among everyone who picked.
            place:
                results && board?.you
                    ? `${formatOrdinal(board.you.rank)} of ${formatCount(board.total)}`
                    : undefined,
        },
        ...(headline && headlineGames.total > 0
            ? [
                  {
                      label: `${headline.name} nominees logged`,
                      part: headlineGames.logged,
                      whole: headlineGames.total,
                  },
              ]
            : []),
        ...(allGames.total > headlineGames.total
            ? [
                  {
                      label: "Nominated games logged",
                      part: allGames.logged,
                      whole: allGames.total,
                  },
              ]
            : []),
    ];

    return (
        <div className={cardClass("flex flex-col gap-4")}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-body-sm font-semibold text-content">
                    {awardsLine(awards)}
                </p>
                {boardButton}
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
                {figures.map((figure) => (
                    <div key={figure.label} className="flex flex-col gap-1.5">
                        <dt className="text-label-sm text-content-muted">
                            {figure.label}
                        </dt>
                        <dd className="flex flex-col gap-2">
                            <span className="flex items-baseline gap-2">
                                <span className="font-mono text-figure-sm text-content tabular-nums">
                                    {figure.part}
                                    <span className="text-content-muted">
                                        /{figure.whole}
                                    </span>
                                </span>
                                {"place" in figure && figure.place && (
                                    <span className="text-label-sm text-content-secondary">
                                        {figure.place}
                                    </span>
                                )}
                            </span>
                            <ShareBar
                                value={
                                    figure.whole === 0
                                        ? 0
                                        : figure.part / figure.whole
                                }
                                label={`${figure.label}: ${figure.part} of ${figure.whole}`}
                            />
                        </dd>
                    </div>
                ))}
            </dl>
            {boardPopup}
        </div>
    );
};

/** An awards night's part of its page: the categories, picks and results. */
const AwardsSection = ({
    event,
    awards,
}: {
    event: EventDetail;
    awards: AwardsDetail;
}) => {
    const { user } = useAuth();
    const { data: myPicks } = useMyPicks(event.slug, !!user);
    const { data: board } = useAwardLeaderboard(
        event.slug,
        awards.phase !== "open",
        event.timing === "live"
    );
    const picks = myPicks ?? {};
    const groups = groupCategories(awards.categories);
    const order = groups.flatMap((g) => g.categories);
    const active = useActiveCategory(order.map(categoryAnchor));

    if (awaitingNominees(awards)) return <AwaitingNominees awards={awards} />;
    if (order.length === 0) return null;
    return (
        <section aria-label="The awards" className="flex flex-col gap-6">
            <Standing
                awards={awards}
                picks={picks}
                signedIn={!!user}
                board={board}
            />
            <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
                <AwardsNav
                    groups={groups}
                    picks={picks}
                    phase={awards.phase}
                    active={active}
                    made={pickedCount(awards.categories, picks)}
                />
                <div className="flex min-w-0 flex-col gap-20">
                    {groups.map((group) => (
                        <div
                            key={`${group.section}-${group.lead}`}
                            className="flex flex-col gap-12"
                        >
                            {group.section && (
                                <SectionHeading name={group.section} />
                            )}
                            {group.categories.map((category) => (
                                <Category
                                    key={category.id}
                                    category={category}
                                    slug={event.slug}
                                    awards={awards}
                                    picks={picks}
                                    signedIn={!!user}
                                    lead={group.lead}
                                />
                            ))}
                        </div>
                    ))}
                    <Button
                        variant="secondary"
                        onClick={goToTop}
                        className="w-full sm:w-auto sm:self-start"
                    >
                        <ArrowUp size={16} aria-hidden />
                        Back to the top
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default AwardsSection;
