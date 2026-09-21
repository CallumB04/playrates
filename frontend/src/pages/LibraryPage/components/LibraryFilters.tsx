import { useState } from "react";
import { ListFilter, Search } from "lucide-react";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import type { Genre, Platform } from "@playrates/shared";
import { SearchInput, Select } from "../../../components/ui/Input";
import Chip from "../../../components/ui/Chip";
import Toggle from "../../../components/ui/Toggle";
import { formatCount } from "../../../lib/format";
import type { LibraryQuery } from "../lib/useLibraryQuery";

interface LibraryFiltersProps {
    query: LibraryQuery;
    setQuery: (patch: Partial<LibraryQuery>) => void;
    /** Local, so typing stays instant while the request is debounced. */
    searchDraft: string;
    onSearchDraft: (value: string) => void;
    matches: number | undefined;
    platforms: Platform[];
    genres: Genre[];
    isSignedIn: boolean;
}

const LibraryFilters = ({
    query,
    setQuery,
    searchDraft,
    onSearchDraft,
    matches,
    platforms,
    genres,
    isSignedIn,
}: LibraryFiltersProps) => {
    const [sheetOpen, setSheetOpen] = useState(false);

    const selects = (
        <>
            <Select
                value={query.genre}
                onChange={(e) => setQuery({ genre: e.target.value })}
                aria-label="Filter by genre"
                className="lg:w-48"
            >
                <option value="">All genres</option>
                {genres.map((genre) => (
                    <option key={genre.slug} value={genre.slug}>
                        {genre.name}
                    </option>
                ))}
            </Select>

            <Select
                value={query.sort}
                onChange={(e) =>
                    setQuery({ sort: e.target.value as LibraryQuery["sort"] })
                }
                aria-label="Sort the catalogue"
                className="lg:w-48"
            >
                <option value="logged">Most logged</option>
                {/* RAWG's collection figure. Kept alongside ours because it
                    covers the whole catalogue, where our count starts at 0. */}
                <option value="popular">Most tracked</option>
                <option value="title">A–Z</option>
                <option value="released">Newest</option>
                <option value="rating">Highest rated</option>
            </Select>
        </>
    );

    const toggles = (
        <>
            <Toggle
                checked={query.excludeLogged}
                onChange={(excludeLogged) => setQuery({ excludeLogged })}
                label="Hide games I've logged"
                // The server can only exclude logs it can attribute.
                disabled={!isSignedIn}
            />
        </>
    );

    const platformChips = (
        <>
            <Chip
                selected={query.platform === ""}
                onClick={() => setQuery({ platform: "" })}
                dotClassName={
                    query.platform === ""
                        ? "bg-content-on-solid"
                        : "bg-content-muted"
                }
            >
                All
            </Chip>
            {platforms.map((platform) => (
                <Chip
                    key={platform.slug}
                    selected={query.platform === platform.slug}
                    onClick={() => setQuery({ platform: platform.slug })}
                    dotClassName={
                        query.platform === platform.slug
                            ? "bg-content-on-solid"
                            : "bg-content-muted"
                    }
                >
                    {platform.displayName}
                </Chip>
            ))}
        </>
    );

    return (
        <>
            <div className="flex flex-col gap-3.5 rounded-lg border border-subtle bg-surface-raised p-4 shadow-plate">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search
                            size={14}
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary"
                        />
                        <SearchInput
                            value={searchDraft}
                            onChange={(e) => onSearchDraft(e.target.value)}
                            aria-label="Search the catalogue"
                            placeholder="Search titles"
                            className="pr-28"
                        />
                        {matches !== undefined && (
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-content-muted">
                                {formatCount(matches)} matches
                            </span>
                        )}
                    </div>

                    {/* Below lg the selects and toggles move into a sheet, so
                        the filter plate doesn't own the whole first screen. */}
                    <div className="hidden gap-3 lg:flex">{selects}</div>

                    <Button
                        variant="secondary"
                        onClick={() => setSheetOpen(true)}
                        className="lg:hidden"
                    >
                        <ListFilter size={15} aria-hidden />
                        Filters
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-subtle pt-3.5">
                    {platformChips}
                    <div className="ml-auto hidden flex-wrap items-center gap-5 lg:flex">
                        {toggles}
                    </div>
                </div>
            </div>

            {sheetOpen && (
                <Modal
                    onClose={() => setSheetOpen(false)}
                    labelledBy="library-filters-title"
                    className="w-full max-w-md"
                >
                    <h2
                        id="library-filters-title"
                        className="border-b border-subtle pb-3 font-display text-section text-content"
                    >
                        Filters
                    </h2>
                    <div className="flex flex-col gap-4 pt-4">
                        {selects}
                        {toggles}
                        <Button onClick={() => setSheetOpen(false)} size="touch">
                            Show results
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default LibraryFilters;
