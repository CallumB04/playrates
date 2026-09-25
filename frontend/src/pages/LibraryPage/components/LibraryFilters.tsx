import { useState } from "react";
import { cardClass } from "../../../components/ui/Card";
import { ListFilter, Search } from "lucide-react";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import type { Genre, Platform } from "@playrates/shared";
import { SearchInput } from "../../../components/ui/Input";
import Dropdown from "../../../components/ui/Dropdown";
import { platformOptions } from "../../../lib/platformIcons";
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

const SORT_OPTIONS = [
    { value: "logged", label: "Most logged" },
    { value: "rating", label: "Highest rated" },
    { value: "metacritic", label: "Metacritic score" },
    { value: "released", label: "Newest" },
    { value: "title", label: "A to Z" },
];

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
            <Dropdown
                options={platformOptions(platforms, "All platforms")}
                value={query.platform}
                onChange={(platform) => setQuery({ platform })}
                placeholder="All platforms"
                aria-label="Filter by platform"
                className="lg:w-44"
            />

            <Dropdown
                options={[
                    { value: "", label: "All genres" },
                    ...genres.map((genre) => ({
                        value: genre.slug,
                        label: genre.name,
                    })),
                ]}
                value={query.genre}
                onChange={(genre) => setQuery({ genre })}
                placeholder="All genres"
                aria-label="Filter by genre"
                className="lg:w-44"
            />

            <Dropdown
                options={SORT_OPTIONS}
                value={query.sort}
                onChange={(sort) =>
                    setQuery({ sort: sort as LibraryQuery["sort"] })
                }
                aria-label="Sort the library"
                className="lg:w-48"
            />
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

    return (
        <>
            <div
                className={cardClass("flex flex-col gap-3.5 p-4", {
                    padding: "none",
                })}
            >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search
                            size={14}
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-secondary"
                        />
                        <SearchInput
                            value={searchDraft}
                            onChange={(e) => onSearchDraft(e.target.value)}
                            aria-label="Search the library"
                            placeholder="Search titles"
                            className="pr-28"
                        />
                        {matches !== undefined && (
                            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-label-sm text-content-muted">
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

                {/* Its own line. The one toggle sitting at the end of a row
                    of platform chips read as another chip. */}
                <div className="hidden items-center gap-5 border-t border-subtle pt-3.5 lg:flex">
                    {toggles}
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
                        <Button
                            onClick={() => setSheetOpen(false)}
                            size="touch"
                        >
                            Show results
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default LibraryFilters;
