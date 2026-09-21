import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import FormField from "./FormField";

interface PasswordFieldProps {
    label?: string;
    error?: string;
    help?: string;
    autoComplete?: string;
    autoFocus?: boolean;
}

const PasswordField = ({
    label = "Password",
    error,
    help,
    autoComplete = "current-password",
    autoFocus,
}: PasswordFieldProps) => {
    const [visible, setVisible] = useState(false);

    return (
        <FormField
            label={label}
            name="password"
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            required
            autoFocus={autoFocus}
            error={error}
            help={help}
            adornment={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    title={visible ? "Hide password" : "Show password"}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-sm p-1 text-content-muted lift hover:text-content"
                >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            }
        />
    );
};

export default PasswordField;
