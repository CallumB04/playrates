import type { ThreadContributor } from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import { cn } from "../../lib/cn";

/** The last few people to post, overlapped, with the rest as a count. */
const ContributorStack = ({
    contributors,
    total,
    className,
}: {
    contributors: ThreadContributor[];
    total: number;
    className?: string;
}) => {
    const extra = total - contributors.length;
    return (
        <span
            className={cn("flex items-center", className)}
            aria-label={`${total} ${total === 1 ? "person" : "people"} in this thread`}
            role="img"
        >
            {contributors.map((c, i) => (
                <span
                    key={c.username}
                    className={cn(
                        "rounded-full ring-2 ring-surface-raised [&>*]:size-7",
                        i > 0 && "-ml-2"
                    )}
                >
                    <ProfilePicture
                        variant="nav"
                        file={c.avatarUrl ?? ""}
                        username={c.username}
                        accent={c.accent}
                        link={false}
                    />
                </span>
            ))}
            {extra > 0 && (
                <span className="-ml-2 grid h-7 min-w-7 place-items-center rounded-full bg-surface-sunken px-1.5 font-mono text-stamp text-content-secondary ring-2 ring-surface-raised">
                    +{extra}
                </span>
            )}
        </span>
    );
};

export default ContributorStack;
