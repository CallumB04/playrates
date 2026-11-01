import { useState } from "react";
import { Plus } from "lucide-react";
import type { PlatformSystem, WishlistEntry } from "@playrates/shared";
import Dropdown from "../../../components/ui/Dropdown";
import { useNotify } from "../../../contexts/NotificationContext";
import { useLogMutations } from "../../../hooks/queries/useGameLogs";
import { useGame } from "../../../hooks/queries/useGames";
import { cn } from "../../../lib/cn";
import { familyOf, systemsForGame } from "../../../lib/gameSystems";
import { systemIcon, systemOptions } from "../../../lib/platformIcons";

const CHIP =
    "relative inline-flex cursor-pointer items-center gap-1 rounded-xs px-1.5 py-0.5 text-label-sm whitespace-nowrap lift " +
    "hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-brand " +
    // 44px of touch around a chip that stays small.
    "before:absolute before:-inset-x-0.5 before:-inset-y-3 before:content-['']";

const ANY = "";

/**
 * The owner's wishlist consoles, each one a menu to change it, and a + to
 * wish for the game on one more. The game's own consoles load as a menu is
 * reached for, so a long wishlist doesn't fetch every game up front.
 */
const WishlistConsoles = ({
    entry,
    systems,
}: {
    entry: WishlistEntry;
    systems: PlatformSystem[];
}) => {
    const notify = useNotify();
    const { patch, create } = useLogMutations();
    const [wanted, setWanted] = useState(false);
    const { data: game } = useGame(wanted ? entry.gameId : undefined);
    const available = systemsForGame(systems, game?.systems ?? []);
    const title = entry.game?.title ?? "this game";

    const wishes = entry.logs.filter((log) => log.status === "wishlist");
    const taken = wishes.flatMap((log) => (log.system ? [log.system] : []));
    const busy = patch.isPending || create.isPending;
    const load = () => setWanted(true);

    const optionsFor = (current: string | null) => [
        // A wish for the game wherever it comes out, while it's the only one.
        ...(wishes.length === 1 ? [{ value: ANY, label: "Any platform" }] : []),
        ...systemOptions(
            available.filter(
                (s) => s.slug === current || !taken.includes(s.slug)
            )
        ),
    ];
    const remaining = systemOptions(
        available.filter((s) => !taken.includes(s.slug))
    );

    const change = (logId: number, value: string) =>
        patch
            .mutateAsync({
                logId,
                input: {
                    system: value || null,
                    platform: value ? familyOf(available, value) : null,
                },
            })
            .catch(() => notify("Couldn’t change that platform", "error"));

    const add = (value: string) =>
        create
            .mutateAsync({
                gameId: entry.gameId,
                status: "wishlist",
                system: value,
                platform: familyOf(available, value) ?? undefined,
            })
            .catch(() => notify("Couldn’t add that platform", "error"));

    return (
        <ul
            className="flex min-w-0 flex-wrap items-center gap-1"
            onPointerEnter={load}
            onFocus={load}
            onTouchStart={load}
        >
            {wishes.map((log) => {
                const system = systems.find((s) => s.slug === log.system);
                const name =
                    system?.displayName ?? log.system ?? "Any platform";
                const Icon = log.system
                    ? systemIcon(log.system, system?.platformSlug ?? "")
                    : null;
                return (
                    <li key={log.id}>
                        <Dropdown
                            options={optionsFor(log.system)}
                            value={log.system ?? ANY}
                            onChange={(value) => {
                                if (value !== (log.system ?? ANY))
                                    void change(log.id, value);
                            }}
                            onOpen={load}
                            disabled={busy}
                            searchable
                            menuClassName="w-60"
                            aria-label={`Platform for ${title}: ${name}. Change it`}
                            triggerClassName={cn(
                                CHIP,
                                log.system
                                    ? "bg-surface-sunken text-content-secondary"
                                    : "border border-dashed border-subtle text-content-muted"
                            )}
                            renderTrigger={() => (
                                <>
                                    {Icon && <Icon size={11} aria-hidden />}
                                    {name}
                                </>
                            )}
                        />
                    </li>
                );
            })}
            {taken.length > 0 && (
                <li>
                    <Dropdown
                        options={remaining}
                        value=""
                        onChange={(value) => void add(value)}
                        onOpen={load}
                        disabled={busy}
                        searchable
                        menuClassName="w-60"
                        placeholder=""
                        aria-label={`Add a platform for ${title}`}
                        triggerClassName={cn(
                            CHIP,
                            "border border-dashed border-subtle px-1 text-content-muted"
                        )}
                        renderTrigger={() => <Plus size={12} aria-hidden />}
                    />
                </li>
            )}
        </ul>
    );
};

export default WishlistConsoles;
