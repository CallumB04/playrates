/**
 * The game's wide art behind the top of its page, faint and fading out on
 * every side, so a game with little else to show still opens on its own
 * colours. Spans the page shell, so its negative margins mirror the shell's
 * padding.
 */
const GameBackdrop = ({ url }: { url: string | null }) => {
    if (!url) return null;
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-7 -z-10 -mx-5 h-[340px] overflow-hidden [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,black_25%,transparent_95%),linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] sm:-mx-8 sm:h-[420px] lg:-mx-12"
        >
            <img
                src={url}
                alt=""
                className="size-full scale-110 object-cover opacity-25 blur-md dark:opacity-40"
            />
        </div>
    );
};

export default GameBackdrop;
