interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    spin: number;
    angle: number;
    size: number;
    colour: string;
    life: number;
    shape: 0 | 1;
}

/** The page's own colours, read from its tokens, for the confetti. */
export const tokenColours = (names: string[]): string[] => {
    const style = getComputedStyle(document.documentElement);
    return names.map((n) => style.getPropertyValue(n).trim()).filter(Boolean);
};

/**
 * A burst of confetti and sparks from a point on a canvas, falling away
 * under gravity and fading. Returns a stop; it stops itself once the last
 * piece is gone.
 */
export const burst = (
    canvas: HTMLCanvasElement,
    {
        colours,
        count = 140,
        origin = { x: 0.5, y: 0.42 },
        power = 1,
    }: {
        colours: string[];
        count?: number;
        origin?: { x: number; y: number };
        power?: number;
    }
): (() => void) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || colours.length === 0) return () => {};
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
    };
    resize();

    const w = () => canvas.width;
    const h = () => canvas.height;
    const pieces: Particle[] = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = (6 + Math.random() * 12) * power * dpr;
        return {
            x: origin.x * w(),
            y: origin.y * h(),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 6 * dpr,
            spin: (Math.random() - 0.5) * 0.4,
            angle: Math.random() * Math.PI,
            size: (4 + Math.random() * 6) * dpr,
            colour: colours[Math.floor(Math.random() * colours.length)]!,
            life: 1,
            shape: Math.random() < 0.6 ? 0 : 1,
        };
    });

    let frame = 0;
    const tick = () => {
        ctx.clearRect(0, 0, w(), h());
        let alive = 0;
        for (const p of pieces) {
            if (p.life <= 0) continue;
            alive++;
            p.vx *= 0.985;
            p.vy = p.vy * 0.985 + 0.32 * dpr;
            p.x += p.vx;
            p.y += p.vy;
            p.angle += p.spin;
            p.life -= 0.008;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.colour;
            if (p.shape === 0) {
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        if (alive > 0) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        ctx.clearRect(0, 0, w(), h());
    };
};
