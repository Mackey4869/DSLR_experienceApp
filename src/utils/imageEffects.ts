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

// Apply film-like luminance noise on a canvas. Strength scales with ISO.
export function applyFilmGrainOnCanvas(outCanvas: HTMLCanvasElement, iso: number, intensity = 1) {
    const w = outCanvas.width;
    const h = outCanvas.height;
    if (w === 0 || h === 0) return;
    const ctx = outCanvas.getContext('2d')!;

    const imgData = ctx.getImageData(0, 0, w, h);
    // Map ISO to a noise strength in [0,1]. Reach full strength around ISO 800.
    const isoRatio = Math.max(1, iso / 100);
    const strength = Math.min(1, Math.log2(isoRatio) / 3) * intensity;
    if (strength <= 0) return;

    // amplitude in luminance units (0-255). Tuned to be subtle at lower strengths.
    const amplitude = 30 * strength;

    // Simple combined luminance noise: add same delta to R/G/B to keep it mostly luminance.
    for (let i = 0; i < imgData.data.length; i += 4) {
        // generate centered random in [-0.5,0.5]
        const r = (Math.random() - 0.5) * 2;
        const delta = r * amplitude;
        imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + delta));
        imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + delta));
        imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + delta));
        // keep alpha
    }

    ctx.putImageData(imgData, 0, 0);
}

// Apply light chrominance (color) noise. Visible more in darker regions and scales with ISO.
export function applyColorNoiseOnCanvas(outCanvas: HTMLCanvasElement, iso: number, intensity = 0.3) {
    const w = outCanvas.width;
    const h = outCanvas.height;
    if (w === 0 || h === 0) return;
    const ctx = outCanvas.getContext('2d')!;

    const imgData = ctx.getImageData(0, 0, w, h);
    const isoRatio = Math.max(1, iso / 100);
    // Chrominance strength grows slower than luminance; tuned to be light by default.
    const strength = Math.min(1, Math.log2(isoRatio) / 4) * intensity;
    if (strength <= 0) return;

    // max color shift per channel (in RGB units). small value to keep it subtle.
    const maxShift = 18 * strength;

    for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i];
        const g = imgData.data[i + 1];
        const b = imgData.data[i + 2];
        // luminance normalized 0..1
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const darkFactor = 1 - lum; // more noise in dark areas

        // small independent noise for R and B, G slightly less to keep color balance
        const rn = (Math.random() - 0.5) * 2 * maxShift * darkFactor;
        const bn = (Math.random() - 0.5) * 2 * maxShift * darkFactor;
        const gn = (Math.random() - 0.5) * 2 * (maxShift * 0.5) * darkFactor;

        imgData.data[i] = Math.min(255, Math.max(0, r + rn));
        imgData.data[i + 1] = Math.min(255, Math.max(0, g + gn));
        imgData.data[i + 2] = Math.min(255, Math.max(0, b + bn));
    }

    ctx.putImageData(imgData, 0, 0);
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
