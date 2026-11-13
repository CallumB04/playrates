import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, UserPlus } from "lucide-react";
import { threadPath } from "../../community/paths";
import type {
    FriendUser,
    Profile,
    RichTextDoc,
    SharedPlayer,
    TrendingThread,
} from "@playrates/shared";
import ArtBackdrop from "../../game/ArtBackdrop";
import GameCover from "../../game/GameCover";
import SegmentedChoice from "../../ui/SegmentedChoice";
import { cardClass } from "../../ui/cardClass";
import { formatCount } from "../../../lib/format";
import FriendProfile from "../../FriendProfile";
import GamePicker, { type PickedGame } from "../../community/GamePicker";
import MessageComposer from "../../community/MessageComposer";
import { InviteButton } from "../../progress/Invite";
import Button from "../../ui/Button";
import Field from "../../ui/Field";
import { Input } from "../../ui/Input";
import Skeleton from "../../ui/Skeleton";
import { queryKeys, searchProfiles } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import {
    useCommunityMutations,
    useTrendingThreads,
} from "../../../hooks/queries/useCommunity";
import {
    useFriendRelation,
    useSharedPlayers,
    useTasteMatches,
} from "../../../hooks/queries/useFriends";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import SheetActions from "./SheetActions";
import type { SheetBodyProps } from "./sheetProps";

const asFriendUser = (profile: Profile): FriendUser => ({
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    accent: profile.accent,
    bio: profile.bio,
    online: profile.online,
});

/** Someone to add, with the button that does it. Their name leads to
 *  their profile, which closes the popup on the way. */
const PersonRow = ({
    person,
    caption,
    covers,
    onLeave,
}: {
    person: FriendUser;
    caption?: string;
    covers?: SharedPlayer["games"];
    onLeave: () => void;
}) => {
    const { relation, send } = useFriendRelation(person.id);
    const asked = relation === "request-sent" || send.isSuccess;
    return (
        <li>
            <FriendProfile
                user={person}
                density="compact"
                trailing={caption}
                closePopup={onLeave}
                actions={
                    <>
                        {/* The games in common, where there's room. */}
                        {covers && covers.length > 0 && (
                            <span
                                aria-hidden
                                className="hidden -space-x-2 sm:flex"
                            >
                                {covers.map((game) => (
                                    <GameCover
                                        key={game.id}
                                        coverUrl={game.coverUrl}
                                        title={game.title}
                                        className="aspect-3/4 w-6 overflow-hidden rounded-[3px] ring-2 ring-surface-raised"
                                    />
                                ))}
                            </span>
                        )}
                        {relation === "friend" ? (
                            <span className="text-label-sm text-content-muted">
                                Friends
                            </span>
                        ) : (
                            <Button
                                size="sm"
                                variant={asked ? "ghost" : "secondary"}
                                onClick={() => send.mutate()}
                                disabled={asked || send.isPending}
                                className="max-sm:min-h-11"
                            >
                                {asked ? (
                                    <Check size={14} aria-hidden />
                                ) : (
                                    <UserPlus size={14} aria-hidden />
                                )}
                                {asked ? "Asked" : "Add"}
                            </Button>
                        )}
                    </>
                }
            />
        </li>
    );
};

const LINK =
    "relative font-medium text-brand-text before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline";

export const FriendBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const me = useAuth().user!;
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim(), 250);
    const searching = term.length >= 2;
    const { data: found, isFetching } = useQuery({
        queryKey: queryKeys.profiles.search(term),
        queryFn: () => searchProfiles(term),
        enabled: searching,
    });
    const { data: shared, isPending: sharedPending } = useSharedPlayers();
    const { data: matches } = useTasteMatches();

    // Typed: who's called that. Otherwise who plays what they play, or
    // failing that who rates like them.
    const suggested = shared?.length
        ? shared.map((s) => ({
              user: s.user,
              caption: `${formatCount(s.shared)} ${s.shared === 1 ? "game" : "games"} in common`,
              covers: s.games,
          }))
        : (matches ?? []).slice(0, 5).map((m) => ({
              user: m.user,
              caption: `${m.agreement}% match`,
              covers: undefined,
          }));

    return (
        <>
            <Field label="Find someone">
                {(a11y) => (
                    <Input
                        {...a11y}
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by username"
                    />
                )}
            </Field>
            {searching ? (
                isFetching && !found ? (
                    <Skeleton className="h-24 w-full rounded-md" />
                ) : (found?.data ?? []).filter((p) => p.id !== me.id).length ? (
                    // Four and a half rows, the half saying there are more. A common name
                    // mustn't push the popup off the screen.
                    <ul className="-mx-1 flex max-h-[17rem] flex-col gap-1 overflow-y-auto overscroll-contain px-1">
                        {found!.data
                            .filter((p) => p.id !== me.id)
                            .map((p) => (
                                <PersonRow
                                    key={p.id}
                                    person={asFriendUser(p)}
                                    onLeave={onSkip}
                                />
                            ))}
                    </ul>
                ) : (
                    <p className="text-body-sm text-content-secondary">
                        No one goes by “{term}”.
                    </p>
                )
            ) : sharedPending ? (
                <Skeleton className="h-32 w-full rounded-md" />
            ) : suggested.length > 0 ? (
                <section className="flex flex-col gap-1.5">
                    <h3 className="text-label text-content-secondary">
                        {shared?.length
                            ? "Most in common"
                            : "They rate games like you do"}
                    </h3>
                    <ul className="flex flex-col gap-1">
                        {suggested.map((s) => (
                            <PersonRow
                                key={s.user.id}
                                person={s.user}
                                caption={s.caption}
                                covers={s.covers}
                                onLeave={onSkip}
                            />
                        ))}
                    </ul>
                </section>
            ) : (
                <p className="text-body-sm text-content-secondary">
                    Log a few games and we’ll suggest people who play them too.
                </p>
            )}
            {/* Somewhere to find more than a popup can hold. */}
            <p className="text-body-sm text-content-secondary">
                Find more on the{" "}
                <Link to="/people" onClick={onSkip} className={LINK}>
                    People page
                </Link>
                , or meet people in the{" "}
                <Link to="/community" onClick={onSkip} className={LINK}>
                    community
                </Link>
                .
            </p>
            <InviteButton className="self-start text-body-sm font-medium">
                Invite a friend who isn’t on PlayRates yet
            </InviteButton>
            <SheetActions onSkip={onSkip}>
                <Button onClick={onDone} className="w-full sm:w-auto">
                    Done
                </Button>
            </SheetActions>
        </>
    );
};

/** A title the thread schema will take: 3 to 120 characters. */
const TITLE_MIN = 3;
const TITLE_MAX = 120;

/** Posts offered to reply to: the liveliest few, as the community shows. */
const OFFERED = 4;

type PostWay = "new" | "reply";
const WAYS = [
    { value: "new" as const, label: "Start a post" },
    { value: "reply" as const, label: "Reply to a post" },
];

const NewPost = ({ onDone, onSkip }: SheetBodyProps) => {
    const [game, setGame] = useState<PickedGame | null>(null);
    const [title, setTitle] = useState("");
    const { createThread } = useCommunityMutations();
    const ready = !!game && title.trim().length >= TITLE_MIN;

    const post = async (body: RichTextDoc) => {
        if (!game || !ready) throw new Error("Pick a game and give it a title");
        await createThread.mutateAsync({
            subject: { kind: "game", gameId: game.id },
            title: title.trim(),
            body,
        });
        onDone();
    };

    return (
        <>
            <Field label="Game">
                {(a11y) => (
                    <GamePicker
                        {...a11y}
                        value={game}
                        onChange={setGame}
                        placeholder="Which game is it about?"
                        inlineResults
                    />
                )}
            </Field>
            <Field label="Title">
                {(a11y) => (
                    <Input
                        {...a11y}
                        value={title}
                        maxLength={TITLE_MAX}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ask something, or start a debate"
                    />
                )}
            </Field>
            <MessageComposer
                label="Your post"
                submitLabel="Post"
                placeholder="Say more…"
                onSubmit={post}
                onCancel={onSkip}
                cancelLabel="Skip for now"
            />
        </>
    );
};

/** A post to answer, over its game's art, as the community shows it. Off
 *  to the post itself: a reply needs what it's replying to. */
const ThreadLink = ({
    thread,
    onGo,
}: {
    thread: TrendingThread;
    onGo: () => void;
}) => {
    const game = thread.subject.kind === "game" ? thread.subject.game : null;
    return (
        <Link
            to={threadPath(thread.id)}
            onClick={onGo}
            className={cardClass(
                "group relative isolate flex w-full items-center gap-3 overflow-hidden p-3 transition-colors hover:border-strong",
                { padding: "none" }
            )}
        >
            {game && <ArtBackdrop url={game.artworkUrl} fade="row" />}
            {game && (
                <span aria-hidden className="contents">
                    <GameCover
                        coverUrl={game.coverUrl}
                        title={game.title}
                        className="aspect-3/4 w-9 shrink-0 overflow-hidden rounded-xs"
                    />
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-body-sm font-medium text-content">
                    {thread.title}
                </span>
                <span className="mt-0.5 block truncate text-label-sm text-content-muted">
                    {game ? `${game.title} · ` : ""}
                    {formatCount(thread.messageCount)}{" "}
                    {thread.messageCount === 1 ? "message" : "messages"}
                </span>
            </span>
            <ArrowRight
                size={16}
                aria-hidden
                className="shrink-0 text-content-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-text"
            />
        </Link>
    );
};

const Reply = ({ onDone, onSkip }: SheetBodyProps) => {
    const { data: threads, isPending } = useTrendingThreads(OFFERED);

    return (
        <>
            {isPending ? (
                <Skeleton className="h-48 w-full rounded-md" />
            ) : threads && threads.length > 0 ? (
                <ul className="flex flex-col gap-2">
                    {threads.map((thread) => (
                        <li key={thread.id}>
                            <ThreadLink thread={thread} onGo={onDone} />
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-md border border-dashed border-strong p-4 text-body-sm text-content-secondary">
                    No posts to reply to yet. Start one instead.
                </p>
            )}
            <SheetActions onSkip={onSkip}>{null}</SheetActions>
        </>
    );
};

export const PostBody = ({ onDone, onSkip }: SheetBodyProps) => {
    const [way, setWay] = useState<PostWay>("new");
    return (
        <>
            <SegmentedChoice
                label="How to post"
                segments={WAYS}
                value={way}
                onChange={setWay}
                fill
            />
            {way === "new" ? (
                <NewPost onDone={onDone} onSkip={onSkip} />
            ) : (
                <Reply onDone={onDone} onSkip={onSkip} />
            )}
        </>
    );
};
