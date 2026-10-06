import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Globe } from "lucide-react";
import { buttonClass } from "../../../components/ui/Button";
import { chipClass } from "../../../components/ui/Chip";
import { platformIcon, type PlatformIcon } from "../../../lib/platformIcons";
import { genreIcon } from "../../../lib/genreIcons";
import { hasFacts, type GameFacts, type NamedSlug } from "../lib/gameFacts";

const Label = ({ children }: { children: ReactNode }) => (
    <span className="text-label-sm text-content-muted">{children}</span>
);

/** Each one opens the library filtered to it, so a chip is a way onwards
 *  rather than only a label. */
const ChipRow = ({
    label,
    items,
    param,
    iconFor,
}: {
    label: string;
    items: NamedSlug[];
    param: "platform" | "genre";
    iconFor: (slug: string) => PlatformIcon;
}) => (
    <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <ul className="flex flex-wrap gap-1.5">
            {items.map(({ slug, name }) => {
                const Icon = iconFor(slug);
                return (
                    <li key={slug}>
                        <Link
                            to={`/library?${param}=${encodeURIComponent(slug)}`}
                            className={chipClass(false, "gap-1.5 px-3", "tag")}
                        >
                            <Icon size={13} aria-hidden className="shrink-0" />
                            {name}
                        </Link>
                    </li>
                );
            })}
        </ul>
    </div>
);

const GameDetails = ({ facts }: { facts: GameFacts }) => {
    if (!hasFacts(facts)) return null;
    const { released, rated, platforms, genres, developers, publishers } =
        facts;

    return (
        <section
            aria-labelledby="game-details"
            className="flex flex-col gap-4 border-t border-subtle pt-4"
        >
            <h2
                id="game-details"
                className="font-display text-base font-semibold text-content"
            >
                Details
            </h2>

            {(released || rated) && (
                <dl className="grid grid-cols-2 gap-3">
                    {released && (
                        <div className="flex flex-col gap-0.5">
                            <dt>
                                <Label>Released</Label>
                            </dt>
                            <dd className="text-body-sm font-medium text-content">
                                {released}
                            </dd>
                        </div>
                    )}
                    {rated && (
                        <div className="flex flex-col gap-0.5">
                            <dt>
                                <Label>Rated</Label>
                            </dt>
                            <dd className="text-body-sm font-medium text-content">
                                {rated}
                            </dd>
                        </div>
                    )}
                </dl>
            )}

            {platforms.length > 0 && (
                <ChipRow
                    label="Platforms"
                    items={platforms}
                    param="platform"
                    iconFor={platformIcon}
                />
            )}

            {genres.length > 0 && (
                <ChipRow
                    label="Genres"
                    items={genres}
                    param="genre"
                    iconFor={genreIcon}
                />
            )}

            {(developers.length > 0 || publishers.length > 0) && (
                <p className="flex flex-col gap-1 text-body-sm text-content-secondary">
                    {developers.length > 0 && (
                        <span>
                            By{" "}
                            <span className="font-medium text-content">
                                {developers.join(", ")}
                            </span>
                        </span>
                    )}
                    {publishers.length > 0 && (
                        <span>
                            Published by{" "}
                            <span className="font-medium text-content">
                                {publishers.join(", ")}
                            </span>
                        </span>
                    )}
                </p>
            )}

            {facts.website && (
                <a
                    href={facts.website.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass(
                        "outline",
                        "max-w-full self-start max-sm:min-h-11",
                        "sm"
                    )}
                >
                    <Globe size={14} aria-hidden className="shrink-0" />
                    <span className="truncate">{facts.website.label}</span>
                    <ArrowUpRight
                        size={14}
                        aria-hidden
                        className="shrink-0 text-content-muted"
                    />
                </a>
            )}
        </section>
    );
};

export default GameDetails;
