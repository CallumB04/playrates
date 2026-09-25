import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
    ThreadTitleSchema,
    isEmptyDoc,
    type RichTextDoc,
} from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useCommunityMutations } from "../../hooks/queries/useCommunity";
import { useGame } from "../../hooks/queries/useGames";
import { usePageTitle } from "../../hooks/usePageTitle";
import Button, { buttonClass } from "../../components/ui/Button";
import { cardClass } from "../../components/ui/Card";
import EmptyPlate from "../../components/ui/EmptyPlate";
import Field from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { TextSkeleton } from "../../components/ui/Skeleton";
import GamePicker, {
    type PickedGame,
} from "../../components/community/GamePicker";
import RichTextEditor from "../../components/community/RichTextEditor";
import { threadPath } from "../../components/community/paths";

const TITLE_MAX = 120;

/**
 * Starting a thread. A page rather than a sheet: the editor wants the room,
 * and on a phone a sheet would leave it a strip above the keyboard.
 */
const NewThreadPage = () => {
    usePageTitle("New thread");
    const navigate = useNavigate();
    const notify = useNotify();
    const { user, isLoading: authLoading } = useAuth();
    const { openLogin } = useAccountForm();
    const { createThread } = useCommunityMutations();

    const [params] = useSearchParams();
    const presetId = Number(params.get("game")) || undefined;
    const { data: preset } = useGame(presetId);

    const [game, setGame] = useState<PickedGame | null>(null);
    const [touchedGame, setTouchedGame] = useState(false);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState<RichTextDoc | null>(null);
    const [uploading, setUploading] = useState(false);
    const [attempted, setAttempted] = useState(false);

    // Arriving from a game's page fills the game in, unless it was changed.
    useEffect(() => {
        if (preset && !game && !touchedGame) {
            setGame({
                id: preset.id,
                title: preset.title,
                coverUrl: preset.coverUrl,
                releaseDate: preset.releaseDate,
            });
        }
    }, [preset, game, touchedGame]);

    if (authLoading) return <TextSkeleton lines={6} />;

    if (!user) {
        return (
            <EmptyPlate
                title="Log in to start a thread"
                body="Threads are signed by whoever starts them."
                action={<Button onClick={openLogin}>Log in</Button>}
            />
        );
    }

    const titleCheck = ThreadTitleSchema.safeParse(title);
    const errors = {
        game: game ? undefined : "Pick the game this thread is about",
        title: titleCheck.success
            ? undefined
            : titleCheck.error.issues[0]?.message,
        body:
            body && !isEmptyDoc(body)
                ? undefined
                : "Say something to start it off",
    };
    const valid = !errors.game && !errors.title && !errors.body;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setAttempted(true);
        if (!valid || !game || !body || uploading) return;

        try {
            const created = await createThread.mutateAsync({
                subject: { kind: "game", gameId: game.id },
                title: title.trim(),
                body,
            });
            navigate(threadPath(created.thread.id), { replace: true });
        } catch (error) {
            notify(
                error instanceof Error
                    ? error.message
                    : "That thread didn't post",
                "error"
            );
        }
    };

    const backTo = presetId ? `/game/${presetId}` : "/community";

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            <Link
                to={backTo}
                className="inline-flex min-h-11 w-max items-center gap-1.5 text-label text-content-muted hover:text-content sm:min-h-0"
            >
                <ArrowLeft size={14} aria-hidden />
                {presetId ? "Back to the game" : "Community"}
            </Link>

            <h1 className="font-display text-title text-content">
                Start a thread
            </h1>

            <form
                onSubmit={(event) => void submit(event)}
                noValidate
                className={cardClass("flex flex-col gap-5")}
            >
                <Field label="Game" error={attempted ? errors.game : undefined}>
                    {(a11y) => (
                        <GamePicker
                            {...a11y}
                            value={game}
                            onChange={(next) => {
                                setTouchedGame(true);
                                setGame(next);
                            }}
                        />
                    )}
                </Field>

                <Field
                    label="Title"
                    help={`${title.trim().length}/${TITLE_MAX}`}
                    error={attempted ? errors.title : undefined}
                >
                    {(a11y) => (
                        <Input
                            {...a11y}
                            value={title}
                            maxLength={TITLE_MAX}
                            placeholder="What do you want to talk about?"
                            onChange={(event) => setTitle(event.target.value)}
                        />
                    )}
                </Field>

                <div className="flex flex-col">
                    <span className="mb-2 text-label-sm text-content-muted">
                        First message
                    </span>
                    <RichTextEditor
                        label="First message"
                        placeholder="Set the scene. Everyone who replies will read this first."
                        onChange={setBody}
                        onUploadingChange={setUploading}
                        disabled={createThread.isPending}
                    />
                    {attempted && errors.body && (
                        <p role="alert" className="mt-1.5 text-xs text-danger">
                            {errors.body}
                        </p>
                    )}
                    <p className="mt-1.5 text-xs text-content-muted">
                        The first message can’t be edited once it’s posted.
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:justify-end">
                    <Link
                        to={backTo}
                        className={buttonClass("secondary", "w-full sm:w-auto")}
                    >
                        Cancel
                    </Link>
                    <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={uploading || createThread.isPending}
                    >
                        {uploading
                            ? "Waiting for pictures…"
                            : createThread.isPending
                              ? "Posting…"
                              : "Post thread"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default NewThreadPage;
