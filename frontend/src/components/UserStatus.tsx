/** Online / offline indicator. */

/**
 * The only call site asks for "sm, then lg from the sm breakpoint up", which
 * the previous API expressed as an array of {value, breakpoint} objects that
 * were concatenated into class names at runtime. A named size keeps the class
 * strings literal so Tailwind can see them.
 */
const STATUS_TEXT_SIZE = {
    responsive: "text-sm sm:text-lg",
    sm: "text-sm",
    lg: "text-lg",
} as const;

export type UserStatusSize = keyof typeof STATUS_TEXT_SIZE;

interface UserStatusProps {
    status: "online" | "offline";
    size?: UserStatusSize;
}

const UserStatus: React.FC<UserStatusProps> = ({
    status,
    size = "responsive",
}) => (
    <div className="flex items-center gap-2">
        <div
            className={`size-2 rounded-full ${status === "online" ? "bg-success" : "bg-danger"} `}
        ></div>
        <p className={`font-lexend ${STATUS_TEXT_SIZE[size]} text-content`}>
            {status}
        </p>
    </div>
);

export default UserStatus;
