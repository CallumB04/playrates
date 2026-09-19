/**
 * Sizes are written as complete class strings rather than composed from a
 * number. Tailwind only emits classes it can find literally in the source, so
 * the old interpolated version needed a safelist — and that safelist did not
 * cover every size actually passed in.
 *
 * Careful: anything resembling a class name, even inside a comment, gets
 * picked up by Tailwind's scanner. Do not write literal utilities here.
 *
 * NOTE on "sm": the old code asked for a larger spinner from the md
 * breakpoint up, but that responsive utility was never emitted (it was
 * neither safelisted nor present statically), so this spinner has always
 * rendered at 16px everywhere. That behaviour is preserved deliberately —
 * making it responsive would be a visual change. See the refactor summary.
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
