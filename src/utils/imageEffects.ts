import { apertureToDof, apertureToStarburst, MAX_APERTURE } from './apertureSettings';

// Apply depth-of-field: blur everything except a circular region centered at (cx, cy)
export async function applyDepthOfFieldFromVideo(video: HTMLVideoElement, outCanvas: HTMLCanvasElement, cx: number, cy: number, aperture: number, brightnessMultiplier = 1) {
    // Blur/DOF disabled per request: draw video directly and apply global brightness only.
    const w = video.videoWidth || video.clientWidth;
    const h = video.videoHeight || video.clientHeight;
    outCanvas.width = w;
    outCanvas.height = h;

    const ctx = outCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.filter = `brightness(${brightnessMultiplier})`;
    ctx.drawImage(video, 0, 0, w, h);
    ctx.filter = 'none';
}

// Apply simple starburst (光芒) on top of an existing canvas (outCanvas should already contain image)
export function applyStarburstOnCanvas(outCanvas: HTMLCanvasElement, aperture: number, bladeCount: number) {
    const w = outCanvas.width;
    const h = outCanvas.height;
    const ctx = outCanvas.getContext('2d')!;

    const imgData = ctx.getImageData(0, 0, w, h);
    // detect bright spots (simple threshold)
    // Make detection threshold depend on aperture: enable starting around F9 and stronger for larger F.
    // t: 0 when aperture<=9, 1 when aperture==MAX_APERTURE
    const startAperture = 9;
    const tAperture = Math.min(1, Math.max(0, (aperture - startAperture) / (MAX_APERTURE - startAperture)));
    // threshold range: when tAperture=0 -> high threshold (~250) (no stars), when tAperture=1 -> lower threshold (~160) (many stars)
    const threshold = 250 - tAperture * 90;
    const brightPoints: Array<{ x: number; y: number; intensity: number }> = [];
    for (let y = 0; y < h; y += 6) {
        for (let x = 0; x < w; x += 6) {
            const i = (y * w + x) * 4;
            const r = imgData.data[i];
            const g = imgData.data[i + 1];
            const b = imgData.data[i + 2];
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            if (brightness > threshold) {
                brightPoints.push({ x, y, intensity: brightness });
            }
        }
    }

    if (brightPoints.length === 0) return;

    // sort by intensity and pick top N
    brightPoints.sort((a, b) => b.intensity - a.intensity);
    const points = brightPoints.slice(0, 6);

    // compute starburst params
    const { radianceR, lineWidth } = apertureToStarburst(aperture, bladeCount);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of points) {
        const cx = p.x;
        const cy = p.y;
        // scale alpha by aperture progression so stars appear gradually as aperture increases
        const rawAlpha = Math.min(0.9, Math.max(0, (p.intensity - threshold) / 60));
        const baseAlpha = rawAlpha * tAperture;

        for (let b = 0; b < bladeCount; b++) {
            const angle = (b / bladeCount) * Math.PI * 2;
            // draw multi-layered strokes along ray
            for (let layer = 0; layer < 5; layer++) {
                const t = layer / 5;
                const len = radianceR * (0.6 + 0.4 * (1 - t));
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255,240,200,${baseAlpha * (0.35 * (1 - t))})`;
                ctx.lineWidth = lineWidth * (1 - 0.6 * t);
                ctx.moveTo(cx, cy);
                const ex = cx + Math.cos(angle) * len;
                const ey = cy + Math.sin(angle) * len;
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }
    }

    ctx.restore();
}

// Convenience: capture from video, apply DOF and starburst and draw on outCanvas
export async function applyApertureEffects(video: HTMLVideoElement, outCanvas: HTMLCanvasElement, tapX: number, tapY: number, aperture: number, bladeCount: number, brightnessMultiplier = 1) {
    await applyDepthOfFieldFromVideo(video, outCanvas, tapX, tapY, aperture, brightnessMultiplier);
    applyStarburstOnCanvas(outCanvas, aperture, bladeCount);
}

export default {
    applyDepthOfFieldFromVideo,
    applyStarburstOnCanvas,
    applyApertureEffects,
};
