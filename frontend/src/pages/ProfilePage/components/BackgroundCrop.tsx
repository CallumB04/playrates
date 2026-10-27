import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { GripHorizontal } from "lucide-react";
import { useWindowSize } from "../../../hooks/useWindowSize";
import { cn } from "../../../lib/cn";
import { backdropAspect, cropWindow, dragPosition } from "../lib/cropPosition";

const PRESETS = [
    { position: 0, label: "Top" },
    { position: 50, label: "Centre" },
    { position: 100, label: "Bottom" },
];

/* Up moves the window up the picture; a page is a tenth of the way. */
const KEY_STEPS: Record<string, (p: number) => number> = {
    ArrowUp: (p) => p - 1,
    ArrowLeft: (p) => p - 1,
    ArrowDown: (p) => p + 1,
    ArrowRight: (p) => p + 1,
    PageUp: (p) => p - 10,
    PageDown: (p) => p + 10,
    Home: () => 0,
    End: () => 100,
};

const clamp = (p: number) => Math.min(100, Math.max(0, p));

/* Below lg the backdrop is deep enough to show nearly a whole screenshot,
   so the outline there would barely move. A computer's strip is the one
   that crops, so a phone is shown that one, at a common laptop's width. */
const DESKTOP = 1024;
const REFERENCE_WIDTH = 1440;

/** What a backdrop leaves out, dimmed above and below the outline. */
const Shade = ({ crop }: { crop: { top: number; height: number } }) => (
    <>
        <span
            aria-hidden
            className="absolute inset-x-0 top-0 bg-surface/70"
            style={{ height: `${crop.top}%` }}
        />
        <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 bg-surface/70"
            style={{ height: `${100 - crop.top - crop.height}%` }}
        />
    </>
);

interface BackgroundCropProps {
    url: string;
    /** 0 the top of the picture to 100 the bottom. */
    position: number;
    onChange: (position: number) => void;
}

/**
 * The whole picture, with the part a profile shows outlined on it. The
 * outline is the backdrop's own shape, which spans the window, so a wider
 * screen shows a thinner strip around the same point.
 */
const BackgroundCrop = ({ url, position, onChange }: BackgroundCropProps) => {
    const { width } = useWindowSize();
    const onDesktop = width >= DESKTOP;
    const strip = backdropAspect(onDesktop ? width : REFERENCE_WIDTH);
    // 16:9 until the picture says otherwise; most screenshots are.
    const [aspect, setAspect] = useState(16 / 9);
    const box = useRef<HTMLDivElement>(null);
    const drag = useRef<{ y: number; start: number } | null>(null);

    const crop = cropWindow(position, aspect, strip);
    const presetCrop = (at: number) => cropWindow(at, aspect, strip);
    const movable = crop.height < 100;

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        const rect = box.current?.getBoundingClientRect();
        if (!rect || !movable) return;
        e.currentTarget.setPointerCapture(e.pointerId);

        // Pressed off the window, it comes to the pointer first.
        const at = ((e.clientY - rect.top) / rect.height) * 100;
        let start = position;
        if (at < crop.top || at > crop.top + crop.height) {
            start = clamp(
                Math.round(((at - crop.height / 2) / (100 - crop.height)) * 100)
            );
            onChange(start);
        }
        drag.current = { y: e.clientY, start };
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const rect = box.current?.getBoundingClientRect();
        if (!drag.current || !rect) return;
        onChange(
            dragPosition({
                start: drag.current.start,
                dy: e.clientY - drag.current.y,
                boxHeight: rect.height,
                windowHeight: crop.height,
            })
        );
    };

    const endDrag = () => {
        drag.current = null;
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = KEY_STEPS[e.key];
        if (!step || !movable) return;
        e.preventDefault();
        onChange(clamp(step(position)));
    };

    return (
        <div className="flex flex-col gap-4">
            <div
                ref={box}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                // A vertical drag here moves the window, not the sheet.
                className={cn(
                    "relative touch-none overflow-hidden rounded-sm bg-surface-sunken select-none",
                    movable && "cursor-grab active:cursor-grabbing"
                )}
            >
                <img
                    src={url}
                    alt=""
                    draggable={false}
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalHeight > 0) {
                            setAspect(img.naturalWidth / img.naturalHeight);
                        }
                    }}
                    className="block w-full"
                />
                <Shade crop={crop} />
                <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Which part of the picture shows"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={position}
                    aria-valuetext={
                        PRESETS.find((p) => p.position === position)?.label ??
                        `${position}% of the way down`
                    }
                    onKeyDown={onKeyDown}
                    style={{ top: `${crop.top}%`, height: `${crop.height}%` }}
                    className="absolute inset-x-0 flex items-center justify-center rounded-xs ring-2 ring-brand ring-inset focus-visible:ring-4 focus-visible:outline-none"
                >
                    {movable && (
                        <span className="flex items-center rounded-full bg-surface-raised/90 px-2 py-0.5 text-content-secondary shadow-lip backdrop-blur-sm">
                            <GripHorizontal size={16} aria-hidden />
                        </span>
                    )}
                </div>
            </div>

            <p className="-mt-2 text-label-sm text-content-muted">
                {onDesktop
                    ? "Outlined is what your profile shows on a screen this size."
                    : "Outlined is what your profile shows on a computer. A phone shows more around it."}
            </p>

            <div
                role="radiogroup"
                aria-label="Jump to part of the picture"
                className="grid grid-cols-3 gap-2 sm:gap-3"
            >
                {PRESETS.map((preset) => {
                    const selected = preset.position === position;
                    return (
                        <button
                            key={preset.label}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(preset.position)}
                            className="group flex cursor-pointer flex-col gap-1.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                            {/* The whole picture again, outlined where
                                this would put the crop. */}
                            <span
                                className={cn(
                                    "relative block w-full overflow-hidden rounded-xs bg-surface-sunken lift",
                                    selected
                                        ? "ring-2 ring-brand"
                                        : "ring-1 ring-subtle group-hover:ring-strong"
                                )}
                                style={{ aspectRatio: aspect }}
                            >
                                <img
                                    src={url}
                                    alt=""
                                    draggable={false}
                                    className="size-full object-cover"
                                />
                                <Shade crop={presetCrop(preset.position)} />
                                <span
                                    aria-hidden
                                    className={cn(
                                        "absolute inset-x-0 ring-inset",
                                        selected
                                            ? "ring-2 ring-brand"
                                            : "ring-1 ring-content-secondary"
                                    )}
                                    style={{
                                        top: `${presetCrop(preset.position).top}%`,
                                        height: `${presetCrop(preset.position).height}%`,
                                    }}
                                />
                            </span>
                            <span
                                className={cn(
                                    "text-center text-label",
                                    selected
                                        ? "font-medium text-content"
                                        : "text-content-secondary group-hover:text-content"
                                )}
                            >
                                {preset.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BackgroundCrop;
