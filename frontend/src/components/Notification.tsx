interface NotificationProps {
    text: string;
    type: "success" | "error" | "pending";
}

// function to return text color, bg color and icon to match the notification type
const typeToValues = (
    type: string
): { textColor: string; bgColor: string; iconName: string } | undefined => {
    switch (type) {
        case "success":
            return {
                textColor: "text-success",
                bgColor: "bg-success-subtle",
                iconName: "circle-check",
            };
        case "error":
            return {
                textColor: "text-danger",
                bgColor: "bg-danger-subtle",
                iconName: "circle-xmark",
            };
        case "pending":
            return {
                textColor: "text-warning",
                bgColor: "bg-warning-subtle",
                iconName: "clock",
            };
    }
};

const Notification: React.FC<NotificationProps> = ({ text, type }) => {
    const { textColor, bgColor, iconName } = typeToValues(type)!;

    return (
        <p
            className={`${textColor} ${bgColor} notification-fadeout fixed bottom-8 right-1/2 z-50 mx-auto flex h-max w-max translate-x-1/2 flex-row items-center gap-x-2 rounded-md px-4 py-2 font-lexend text-lg sm:right-8 sm:translate-x-0`}
        >
            <i className={`fa-regular fa-${iconName}`}></i>
            <span>{text}</span>
        </p>
    );
};

export default Notification;
