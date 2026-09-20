/**
 * Complete class strings, never composed from a number — Tailwind only emits
 * what it finds literally in the source. Don't name a utility class in a
 * comment here either; the scanner reads those too.
 *
 * "sm" is deliberately not responsive.
 */
const SPINNER_SIZE = {
    sm: "size-4",
    md: "size-7 md:size-8",
    lg: "size-9 md:size-10",
} as const;

export type SpinnerSize = keyof typeof SPINNER_SIZE;

interface LoadingSpinnerProps {
    size: SpinnerSize;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size }) => (
    <div
        className={`${SPINNER_SIZE[size]} animate-spin rounded-full border-2 border-content border-t-brand`}
    ></div>
);

export default LoadingSpinner;
