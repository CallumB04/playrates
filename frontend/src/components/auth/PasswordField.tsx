import { useState } from "react";
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
            className="w-full rounded-lg border border-field bg-transparent py-[14px] pl-3 pr-11 focus:border-brand focus:outline-none sm:rounded-none sm:border-0 sm:border-b sm:border-content sm:py-[6px] sm:pl-[2px] sm:pr-10"
            adornment={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    title={visible ? "Hide" : "Show"}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    className={`fa-regular ${visible ? "fa-eye-slash" : "fa-eye"} absolute ${visible ? "right-[11px]" : "right-3"} hover-text-white top-[14px] mr-1 text-xl sm:top-1 sm:mr-0 sm:text-base`}
                ></button>
            }
        />
    );
};

export default PasswordField;
