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
    /** The catalogue's most-tracked title, shown with its real figures. */
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
            <p className="flex items-center gap-2.5 font-mono text-label uppercase text-accent">
                <span aria-hidden className="h-px w-6 bg-accent" />
                {siteStats
                    ? `${formatCount(siteStats.gameCount)} titles on file`
                    : "An accession ledger for games"}
            </p>

            <h1 className="mt-3.5 max-w-[16ch] font-display text-hero text-content">
                Keep a record of everything you play.
            </h1>

            <p className="mt-4 max-w-[54ch] text-[17px] leading-relaxed text-content-secondary">
                Rate to the quarter point, track the hours, and let the backlog
                be honest with you. Your library is a page worth linking to —
                not a spreadsheet you hide.
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
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5 border-t border-strong pt-5">
                {[
                    { label: "Members", value: siteStats?.userCount },
                    { label: "Games catalogued", value: siteStats?.gameCount },
                    { label: "Logs kept", value: siteStats?.logCount },
                ].map((stat) => (
                    <div key={stat.label}>
                        <dt className="font-mono text-label uppercase text-content-muted">
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

        {/* A card from the drawer. Real figures for a real game rather than a
            fabricated shelf — the labels are community ones, not personal. */}
        <aside className="border border-strong bg-surface-sunken p-5 inset-shadow-deep">
            <p className="mb-3.5 font-mono text-label uppercase text-content-muted">
                A card from the drawer
            </p>

            {!feature ? (
                <TextSkeleton lines={4} />
            ) : (
                <div className="border border-strong bg-surface-raised p-4 shadow-lip">
                    <div className="flex gap-4">
                        <Link
                            to={`/game/${feature.id}`}
                            className="w-[88px] shrink-0"
                        >
                            <GameCover
                                coverUrl={feature.coverUrl}
                                title={feature.title}
                                className="aspect-3/4 w-full shadow-cover"
                            />
                        </Link>
                        <div className="min-w-0">
                            <p className="font-mono text-label-sm uppercase text-accent">
                                Most logged
                            </p>
                            <Link
                                to={`/game/${feature.id}`}
                                className="mt-1 block font-display text-xl leading-tight text-content hover:text-brand"
                            >
                                {feature.title}
                            </Link>
                            <p className="mt-2 font-mono text-figure-lg text-brand">
                                {formatRating(featureStats?.averageRating)}
                            </p>
                        </div>
                    </div>

                    <LedgerList className="mt-3.5">
                        <LedgerRow
                            label="PlayRates average"
                            value={`${formatCount(
                                featureStats?.ratingCount ?? 0
                            )} ratings`}
                        />
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
