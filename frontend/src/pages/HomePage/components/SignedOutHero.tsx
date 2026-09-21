import { Link } from "react-router-dom";
import type { Game, GameStats } from "@playrates/shared";
import Button, { buttonClass } from "../../../components/ui/Button";
import LedgerRow, { LedgerList } from "../../../components/ui/LedgerRow";
import GameCover from "../../../components/game/GameCover";
import Figure from "../../../components/ui/Figure";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import type { SiteStats } from "../../../api";
import { formatCount, formatRating, releaseYear } from "../../../lib/format";

interface SignedOutHeroProps {
    siteStats: SiteStats | undefined;
    /** The most-logged title, shown with its real community figures. */
    feature: Game | undefined;
    featureStats: GameStats | undefined;
    onStart: () => void;
}

const SignedOutHero = ({
    siteStats,
    feature,
    featureStats,
    onStart,
}: SignedOutHeroProps) => (
    <div className="grid items-start gap-10 py-3 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
        <div>
            <p className="flex items-center gap-2.5 text-label text-accent">
                <span aria-hidden className="h-px w-6 bg-accent" />
                {siteStats
                    ? `${formatCount(siteStats.gameCount)} games to choose from`
                    : "A home for everything you play"}
            </p>

            <h1 className="mt-3.5 max-w-[16ch] font-display text-hero text-content">
                Keep a record of everything you play.
            </h1>

            <p className="mt-4 max-w-[44ch] text-[17px] leading-relaxed text-content-secondary">
                Rate to the half point, track the hours, and let the backlog be
                honest with you. Your library is a page worth linking to, not a
                spreadsheet you hide.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={onStart}>
                    Start your library
                </Button>
                <Link
                    to="/library"
                    className={buttonClass("ghost", undefined, "lg")}
                >
                    Browse the catalogue
                </Link>
            </div>

            {/* Sized to content, not equal thirds — a six-figure catalogue
                count is wider than a third of the column. */}
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5 border-t border-subtle pt-5">
                {[
                    { label: "Members", value: siteStats?.userCount },
                    { label: "Games catalogued", value: siteStats?.gameCount },
                    { label: "Logs kept", value: siteStats?.logCount },
                ].map((stat) => (
                    <div key={stat.label}>
                        <dt className="text-label text-content-muted">
                            {stat.label}
                        </dt>
                        <dd className="mt-1.5">
                            <Figure
                                value={stat.value ?? 0}
                                size="display"
                                roll
                                className="text-content"
                            />
                        </dd>
                    </div>
                ))}
            </dl>
        </div>

        {/* Real figures for a real game rather than an invented shelf — so the
            labels are community ones, not personal. */}
        <aside>
            <p className="mb-3 text-label text-content-muted">
                Most logged this week
            </p>

            {!feature ? (
                <TextSkeleton lines={4} />
            ) : (
                <div className="rounded-lg border border-subtle bg-surface-raised p-5 shadow-plate">
                    <div className="flex gap-4">
                        <Link
                            to={`/game/${feature.id}`}
                            className="w-[88px] shrink-0"
                        >
                            <GameCover
                                coverUrl={feature.coverUrl}
                                title={feature.title}
                                className="aspect-3/4 w-full rounded-md shadow-e2"
                            />
                        </Link>
                        <div className="min-w-0">
                            <Link
                                to={`/game/${feature.id}`}
                                className="block font-display text-xl leading-tight text-content hover:text-brand"
                            >
                                {feature.title}
                            </Link>
                            <p className="mt-1.5 font-mono text-figure-lg text-brand">
                                {formatRating(featureStats?.averageRating)}
                            </p>
                            <p className="mt-0.5 text-label-sm text-content-muted">
                                {formatCount(featureStats?.ratingCount ?? 0)}{" "}
                                {featureStats?.ratingCount === 1
                                    ? "rating"
                                    : "ratings"}
                            </p>
                        </div>
                    </div>

                    <LedgerList className="mt-4">
                        <LedgerRow
                            label="Logs kept"
                            value={formatCount(featureStats?.logCount ?? 0)}
                        />
                        <LedgerRow
                            label="Released"
                            value={releaseYear(feature.releaseDate)}
                        />
                        <LedgerRow
                            label="Platforms"
                            value={String(feature.platforms.length)}
                            rule={false}
                        />
                    </LedgerList>
                </div>
            )}
        </aside>
    </div>
);

export default SignedOutHero;
