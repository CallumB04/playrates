import { cn } from "../lib/cn";

/** Complete class strings — Tailwind only emits what it finds literally. */
const SPINNER_SIZE = {
    sm: "size-4",
    md: "size-7 md:size-8",
    lg: "size-9 md:size-10",
} as const;

export type SpinnerSize = keyof typeof SPINNER_SIZE;

interface LoadingSpinnerProps {
    size: SpinnerSize;
    className?: string;
}

/**
 * An arc with rounded caps. The stroke fades along its length so the leading
 * end is bright and the tail falls away, which reads as motion even in a
 * still frame.
 */
const LoadingSpinner = ({ size, className }: LoadingSpinnerProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        role="status"
        aria-label="Loading"
        className={cn("animate-spin", SPINNER_SIZE[size], className)}
    >
        <defs>
            {/* Unique per render would be ideal, but two spinners on one page
                sharing a gradient is harmless — they are identical. */}
            <linearGradient id="spinner-taper" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
            </linearGradient>
        </defs>
        <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="2.5"
        />
        <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="url(#spinner-taper)"
            strokeWidth="2.5"
            strokeLinecap="round"
        />
    </svg>
);

export default LoadingSpinner;
