import { Link, useParams, useSearchParams } from "react-router-dom";
import {
    hubFilters,
    hubPath,
    hubWords,
    isHubYear,
    type Game,
    type GameSort,
    type Hub,
} from "@playrates/shared";
import {
    useGame,
    useGameRelated,
    useGames,
    useGenres,
    usePlatforms,
} from "../../hooks/queries/useGames";
import { usePagination } from "../../hooks/usePagination";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useWindowSize } from "../../hooks/useWindowSize";
import GameTile from "../../components/game/GameTile";
import { useTileActions } from "../../components/game/useTileActions";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import { TileSkeleton } from "../../components/ui/Skeleton";
import EmptyPlate from "../../components/ui/EmptyPlate";
import { buttonClass } from "../../components/ui/buttonClass";
import NotFoundPage from "../NotFoundPage";
import { getLibraryGamesPerPage } from "../LibraryPage/lib/gamesPerPage";
import { libraryFoot } from "../LibraryPage/lib/libraryFoot";
import { logMeta } from "../LibraryPage/lib/logMeta";

type Kind = Hub["kind"];

const GRID =
    "grid grid-cols-3 gap-x-4 gap-y-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7";

/**
 * Which hub the address names, once the names it needs have loaded:
 * undefined while they load, null for one the site doesn't have.
 */
const useHub = (kind: Kind): Hub | null | undefined => {
    const params = useParams();
    const { data: genres } = useGenres();
    const { data: platforms } = usePlatforms();
    const gameId = Number(params.gameID);
    const { data: game, isError } = useGame(
        kind === "similar" && Number.isInteger(gameId) ? gameId : undefined
    );

    switch (kind) {
        case "year": {
            const year = Number(params.year);
            return isHubYear(year) ? { kind, year } : null;
        }
        case "upcoming":
            return { kind };
        case "genre": {
            if (!genres) return undefined;
            const genre = genres.find((g) => g.slug === params.slug);
            return genre ? { kind, slug: genre.slug, name: genre.name } : null;
        }
        case "platform": {
            if (!platforms) return undefined;
            const platform = platforms.find((p) => p.slug === params.slug);
            return platform
                ? { kind, slug: platform.slug, name: platform.displayName }
                : null;
        }
        case "similar":
            if (isError || !Number.isInteger(gameId)) return null;
            return game
                ? { kind, gameId: game.id, title: game.title }
                : undefined;
    }
};

/** A year's best links to the years either side of it. */
const YearSteps = ({ year }: { year: number }) => {
    const steps = [year - 1, year + 1].filter((y) => isHubYear(y));
    return (
        <nav aria-label="Other years" className="flex flex-wrap gap-2">
            {steps.map((y) => (
                <Link
                    key={y}
                    to={hubPath({ kind: "year", year: y })}
                    className={buttonClass("secondary", "", "sm")}
                >
                    {y < year ? `← ${y}` : `${y} →`}
                </Link>
            ))}
        </nav>
    );
};

const Grid = ({ games, sort }: { games: Game[]; sort: GameSort }) => {
    const { data: platforms } = usePlatforms();
    const { actionsFor, statusFor, logFor } = useTileActions();
    return (
        <div className={GRID}>
            {games.map((game) => {
                const log = logFor(game.id);
                const foot = libraryFoot(game, sort, log);
                return (
                    <GameTile
                        key={game.id}
                        gameId={game.id}
                        title={game.title}
                        coverUrl={game.coverUrl}
                        platformSlugs={game.platforms}
                        platforms={platforms ?? []}
                        rating={foot.rating}
                        footValue={foot.value}
                        status={statusFor(game)}
                        meta={logMeta(log)}
                        actions={actionsFor(game)}
                        narrowFoot
                    />
                );
            })}
        </div>
    );
};

/** A slice of the library, a page at a time. */
const SliceGames = ({ hub }: { hub: Exclude<Hub, { kind: "similar" }> }) => {
    const { width } = useWindowSize();
    const perPage = getLibraryGamesPerPage(width);
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const filters = hubFilters(hub);
    const { data, isLoading } = useGames({
        ...filters,
        page,
        limit: perPage,
    });
    const pagination = usePagination({
        total: data?.meta.total ?? 0,
        perPage,
        page,
        onPageChange: (next) =>
            setParams((current) => {
                current.set("page", String(next));
                return current;
            }),
    });

    if (isLoading) {
        return (
            <div className={GRID}>
                {Array.from({ length: perPage }, (_, i) => (
                    <TileSkeleton key={i} />
                ))}
            </div>
        );
    }
    if (!data || data.data.length === 0) {
        return (
            <EmptyPlate
                title="Nothing here yet"
                body="Browse the library for everything else."
            />
        );
    }
    return (
        <>
            <Grid games={data.data} sort={filters.sort} />
            <div className="flex justify-end border-t border-subtle pt-5">
                <Pagination
                    pagination={pagination}
                    onChange={() => window.scrollTo({ top: 0 })}
                />
            </div>
        </>
    );
};

const SimilarGames = ({ gameId }: { gameId: number }) => {
    const { data, isLoading } = useGameRelated(gameId);
    if (isLoading) {
        return (
            <div className={GRID}>
                {Array.from({ length: 8 }, (_, i) => (
                    <TileSkeleton key={i} />
                ))}
            </div>
        );
    }
    if (!data || data.similar.length === 0) {
        return (
            <EmptyPlate
                title="Nothing here yet"
                body="Browse the library for everything else."
            />
        );
    }
    return <Grid games={data.similar} sort="logged" />;
};

/**
 * A page of games chosen one way: a year's best, a genre, a platform,
 * what's coming, games like one game. The words come from shared, so the
 * head the server sends says the same as this.
 */
const HubPage = ({ kind }: { kind: Kind }) => {
    const hub = useHub(kind);
    const words = hub ? hubWords(hub) : null;
    usePageMeta({
        title: words?.title ?? null,
        description: words?.description ?? null,
    });

    if (hub === null) return <NotFoundPage />;

    return (
        <section className="flex flex-col gap-6">
            <PageHeader
                title={words?.heading ?? ""}
                note={words?.lead}
                back={
                    hub?.kind === "similar"
                        ? { to: `/game/${hub.gameId}`, label: hub.title }
                        : undefined
                }
                actions={
                    hub?.kind === "year" ? (
                        <YearSteps year={hub.year} />
                    ) : undefined
                }
            />
            {hub &&
                (hub.kind === "similar" ? (
                    <SimilarGames gameId={hub.gameId} />
                ) : (
                    <SliceGames hub={hub} />
                ))}
        </section>
    );
};

export default HubPage;
