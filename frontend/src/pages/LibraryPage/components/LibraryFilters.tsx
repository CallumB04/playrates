import { useState } from "react";
import { cardClass } from "../../../components/ui/cardClass";
import { ListFilter, Search } from "lucide-react";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import type { Genre, Platform } from "@playrates/shared";
import { SearchInput } from "../../../components/ui/Input";
import Dropdown, { type DropdownOption } from "../../../components/ui/Dropdown";
import Field from "../../../components/ui/Field";
import { platformOptions } from "../../../lib/platformIcons";
import Toggle from "../../../components/ui/Toggle";
import type { LibraryQuery } from "../lib/useLibraryQuery";

interface LibraryFiltersProps {
    query: LibraryQuery;
    setQuery: (patch: Partial<LibraryQuery>) => void;
    /** Local, so typing stays instant while the request is debounced. */
    searchDraft: string;
    onSearchDraft: (value: string) => void;
    platforms: Platform[];
    genres: Genre[];
    isSignedIn: boolean;
}

const SORT_OPTIONS = [
    { value: "logged", label: "Most logged" },
    { value: "rating", label: "Highest rated" },
    { value: "critic", label: "Critic score" },
    { value: "released", label: "Newest" },
    { value: "title", label: "A to Z" },
];

const LibraryFilters = ({
    query,
    setQuery,
    searchDraft,
    onSearchDraft,
    platforms,
    genres,
    isSignedIn,
}: LibraryFiltersProps) => {
    const [sheetOpen, setSheetOpen] = useState(false);

    const genreOptions: DropdownOption[] = [
        { value: "", label: "All" },
        ...genres.map((genre) => ({ value: genre.slug, label: genre.name })),
    ];

    const selects = [
        {
            label: "Platform",
            ariaLabel: "Filter by platform",
            options: platformOptions(platforms, "All"),
            value: query.platform,
            onChange: (platform: string) => setQuery({ platform }),
            width: "w-68",
        },
        {
            label: "Genre",
            ariaLabel: "Filter by genre",
            options: genreOptions,
            value: query.genre,
            onChange: (genre: string) => setQuery({ genre }),
            width: "w-68",
        },
        {
            label: "Sort by",
            ariaLabel: "Sort the library",
            options: SORT_OPTIONS,
            value: query.sort,
            onChange: (sort: string) =>
                setQuery({ sort: sort as LibraryQuery["sort"] }),
            width: "w-56",
        },
    ];

    // In the bar, each says what it is inside itself; in the sheet, above.
    // Wide enough for "Commodore / Amiga" with its mark, and "Hack and
    // slash/Beat 'em up".
    const inBar = selects.map(({ label, ariaLabel, width, ...select }) => (
        <Dropdown
            key={label}
            {...select}
            placeholder="All"
            lead={label}
            aria-label={ariaLabel}
            className={width}
        />
    ));
    const inSheet = selects.map(({ label, options, value, onChange }) => (
        <Field key={label} label={label}>
            {({ id }) => (
                <Dropdown
                    id={id}
                    options={options}
                    value={value}
                    onChange={onChange}
                    placeholder="All"
                />
            )}
        </Field>
    ));

    const toggles = (
        <>
            <Toggle
                checked={query.excludeLogged}
                onChange={(excludeLogged) => setQuery({ excludeLogged })}
                label="Hide games I’ve logged"
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
                        />
                    </div>

                    {/* Below xl the selects and toggles move into a sheet, so
                        the filter plate doesn't own the whole first screen,
                        and the search keeps its width beside them. */}
                    <div className="hidden gap-3 xl:flex">{inBar}</div>

                    <Button
                        variant="secondary"
                        onClick={() => setSheetOpen(true)}
                        className="xl:hidden"
                    >
                        <ListFilter size={15} aria-hidden />
                        Filters
                    </Button>
                </div>

                {/* Its own line. The one toggle sitting at the end of a row
                    of platform chips read as another chip. */}
                <div className="hidden items-center gap-5 border-t border-subtle pt-3.5 xl:flex">
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
                        {inSheet}
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
