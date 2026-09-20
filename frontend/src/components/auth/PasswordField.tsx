import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import FormField from "./FormField";

interface PasswordFieldProps {
    error?: string;
    autoFocus?: boolean;
}

const PasswordField = ({ error, autoFocus }: PasswordFieldProps) => {
    const [visible, setVisible] = useState(false);

    return (
        <FormField
            label="Password"
            name="password"
            type={visible ? "text" : "password"}
            placeholder="Password"
            autoComplete="current-password"
            required
            autoFocus={autoFocus}
            error={error}
            className="w-full rounded-lg border border-field bg-transparent py-[14px] pr-11 pl-3 focus:border-brand focus:outline-none sm:rounded-none sm:border-0 sm:border-b sm:border-content sm:py-[6px] sm:pr-10 sm:pl-[2px]"
            adornment={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    title={visible ? "Hide" : "Show"}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    className="absolute top-[14px] right-3 mr-1 cursor-pointer text-content transition-colors duration-200 hover:text-brand sm:top-1 sm:mr-0"
                >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            }
        />
    );
};

export default PasswordField;
