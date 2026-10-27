import { useRef, useState, type PointerEvent } from "react";
import { BackdropArt } from "../../../components/layout/PageBackdrop";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import { coverHeight, dragPosition } from "../lib/cropPosition";

const PRESETS = [
    { value: "0", label: "Top" },
    { value: "50", label: "Centre" },
    { value: "100", label: "Bottom" },
];

interface BackgroundCropProps {
    url: string;
    /** 0 the top of the picture to 100 the bottom. */
    position: number;
    onChange: (position: number) => void;
}

/**
 * Which part of the picture shows. The preview is the backdrop's own
 * drawing at a wide window's shape, the most it is ever cropped; a phone
 * shows more of the picture around the same point.
 */
const BackgroundCrop = ({ url, position, onChange }: BackgroundCropProps) => {
    const frame = useRef<HTMLDivElement>(null);
    const [natural, setNatural] = useState({ width: 0, height: 0 });
    const drag = useRef<{ y: number; start: number } | null>(null);

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { y: e.clientY, start: position };
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const box = frame.current?.getBoundingClientRect();
        if (!drag.current || !box) return;
        onChange(
            dragPosition({
                start: drag.current.start,
                dy: e.clientY - drag.current.y,
                frameHeight: box.height,
                imageHeight: coverHeight(
                    box.width,
                    natural.width,
                    natural.height
                ),
            })
        );
    };

    const endDrag = () => {
        drag.current = null;
    };

    return (
        <div className="flex flex-col gap-3">
            <div
                ref={frame}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                // A vertical drag here moves the picture, not the sheet.
                className="relative aspect-[4/1] w-full cursor-grab touch-none overflow-hidden rounded-sm bg-surface active:cursor-grabbing"
            >
                <BackdropArt
                    url={url}
                    position={position}
                    className="absolute inset-0"
                    // A drag is measured against how far the picture
                    // overhangs the frame, so it needs the picture's shape.
                    onLoad={(img) =>
                        setNatural({
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                        })
                    }
                />
            </div>

            <div className="flex flex-col gap-1">
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={position}
                    onChange={(e) => onChange(Number(e.target.value))}
                    aria-label="Which part of the picture shows"
                    aria-valuetext={`${position}% from the top`}
                    className="h-11 w-full cursor-pointer accent-brand sm:h-8"
                />
                <div
                    aria-hidden
                    className="flex justify-between text-label-sm text-content-muted"
                >
                    <span>Top</span>
                    <span>Bottom</span>
                </div>
            </div>

            <SegmentedChoice
                label="Jump to part of the picture"
                segments={PRESETS}
                value={String(position)}
                onChange={(value) => onChange(Number(value))}
                fill
                className="sm:max-w-sm"
            />
        </div>
    );
};

export default BackgroundCrop;
