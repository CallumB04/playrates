import { cn } from "../lib/cn";

/** Named sizes keep the class strings literal so Tailwind can see them. */
const STATUS_TEXT_SIZE = {
    sm: "text-label-sm",
    md: "text-label",
} as const;

export type UserStatusSize = keyof typeof STATUS_TEXT_SIZE;

interface UserStatusProps {
    online: boolean;
    size?: UserStatusSize;
    className?: string;
}

/**
 * Presence said in words, where there is room for them — the profile header.
 * Offline is muted, not red: being away is not an error, and PresenceDot on
 * the avatar says the same thing in the same colours.
 */
const UserStatus = ({ online, size = "md", className }: UserStatusProps) => (
    <span
        className={cn(
            "flex items-center gap-1.5",
            STATUS_TEXT_SIZE[size],
            online ? "text-success" : "text-content-muted",
            className
        )}
    >
        <span
            aria-hidden
            className={cn(
                "size-[7px] rounded-full",
                online ? "bg-success" : "bg-content-muted"
            )}
        />
        {online ? "Online" : "Offline"}
    </span>
);

export default UserStatus;
