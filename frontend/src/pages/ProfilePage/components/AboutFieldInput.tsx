import type { FocusEvent } from "react";
import Field from "../../../components/ui/Field";
import { IconInput, Input } from "../../../components/ui/Input";
import type { AboutRow } from "../lib/about";

interface AboutFieldInputProps {
    row: AboutRow;
    value: string;
    onChange: (value: string) => void;
    onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
    error?: string;
    disabled?: boolean;
}

/** One About field, as both the profile editor and Settings edit it. A
 *  social account carries its mark inside the field. */
const AboutFieldInput = ({
    row,
    value,
    onChange,
    onBlur,
    error,
    disabled,
}: AboutFieldInputProps) => (
    <Field label={row.label} error={error}>
        {(a11y) => {
            const props = {
                ...a11y,
                type: row.type ?? "text",
                value,
                placeholder: row.placeholder,
                onChange: (e: { target: { value: string } }) =>
                    onChange(e.target.value),
                onBlur,
                disabled,
            };
            return row.group === "socials" ? (
                <IconInput icon={row.icon} {...props} />
            ) : (
                <Input {...props} />
            );
        }}
    </Field>
);

export default AboutFieldInput;
