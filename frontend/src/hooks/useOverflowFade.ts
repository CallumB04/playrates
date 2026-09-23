import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react";

/** How far the fade reaches in from an edge that has more behind it. */
const FADE = "18px";

/**
 * Which ends of a horizontal scroller have more behind them, so those edges
 * can be faded. A strip whose content fits is left alone.
 */
export const useOverflowFade = <T extends HTMLElement>() => {
    const ref = useRef<T>(null);
    const [edges, setEdges] = useState({ start: false, end: false });

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setEdges({
            // 1px of slack: fractional widths never land exactly on the end.
            start: el.scrollLeft > 1,
            end: max > 1 && el.scrollLeft < max - 1,
        });
    }, []);

    useEffect(() => {
        measure();
        const el = ref.current;
        if (!el) return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [measure]);

    const style: CSSProperties | undefined =
        edges.start || edges.end
            ? {
                  maskImage: `linear-gradient(to right, ${
                      edges.start ? `transparent 0, black ${FADE}` : "black 0"
                  }, ${
                      edges.end
                          ? `black calc(100% - ${FADE}), transparent 100%`
                          : "black 100%"
                  })`,
              }
            : undefined;

    return { ref, style, onScroll: measure };
};
