import { apertureToDof, apertureToStarburst, MAX_APERTURE } from './apertureSettings';

// [追加]: SS文字列を数値に変換し、長秒露光用のアルファ値を計算するヘルパー
/**
 * Shutter Speedの文字列（"1/60", "1" など）を数値（秒）に変換し、
 * フレーム描画時のアルファ（0.0〜1.0）を計算します。
 * @param ssStr Shutter Speed文字列
 * @param fps 想定FPS (デフォルト30)
 * @returns { value: number, alpha: number }
 */
export function calculateLongExposureAlpha(ssStr: string, fps: number = 30): { value: number, alpha: number } {
    let ssValue: number = 1 / 125;
    if (ssStr.includes('/')) {
        const parts = ssStr.split('/');
        ssValue = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
        ssValue = parseFloat(ssStr);
    }

    const frameTime = 1 / fps;
    // SSがフレーム時間より長い場合、残像が発生するようにアルファ値を下げる
    // 1/60s (0.016) < 1/30s (0.033) -> alpha = 1.0
    // 1s (1.0) > 1/30s (0.033) -> alpha = 0.033
    const alpha = Math.min(1.0, frameTime / ssValue);
    return { value: ssValue, alpha };
}

// Apply depth-of-field: blur everything except a circular region centered at (cx, cy)
export async function applyDepthOfFieldFromVideo(
    video: HTMLVideoElement, 
    outCanvas: HTMLCanvasElement, 
    cx: number, 
    cy: number, 
    aperture: number, 
    brightnessMultiplier = 1,
    alpha = 1.0 // [追加]: アルファ値引数
) {
    // Blur/DOF disabled per request: draw video directly and apply global brightness only.
    const vw = video.videoWidth || video.clientWidth;
    const vh = video.videoHeight || video.clientHeight;
    const cw = outCanvas.width;
    const ch = outCanvas.height;

    if (vw === 0 || vh === 0 || cw === 0 || ch === 0) return;

    const ctx = outCanvas.getContext('2d')!;

    // [追加]: 長秒露光（残像）処理。alphaが1.0未満の場合はclearRectをスキップして重ね書きする。
    if (alpha >= 1.0) {
        ctx.clearRect(0, 0, cw, ch);
    }

    // Calculate "cover" dimensions: maintain aspect ratio and crop to fill
    const videoAspect = vw / vh;
    const canvasAspect = cw / ch;

    let sx, sy, sw, sh;
    if (videoAspect > canvasAspect) {
        // Video is wider than canvas: crop width
        sh = vh;
        sw = vh * canvasAspect;
        sx = (vw - sw) / 2;
        sy = 0;
    } else {
        // Video is taller than canvas: crop height
        sw = vw;
        sh = vw / canvasAspect;
        sx = 0;
        sy = (vh - sh) / 2;
    }

    // [追加]: アルファ値を設定して残像を表現
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = `brightness(${brightnessMultiplier})`;
    // Draw the cropped portion of the video to fill the entire canvas
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.filter = 'none';
    ctx.restore();
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
export async function applyApertureEffects(
    video: HTMLVideoElement, 
    outCanvas: HTMLCanvasElement, 
    tapX: number, 
    tapY: number, 
    aperture: number, 
    bladeCount: number, 
    brightnessMultiplier = 1,
    alpha = 1.0 // [追加]: アルファ値引数
) {
    await applyDepthOfFieldFromVideo(video, outCanvas, tapX, tapY, aperture, brightnessMultiplier, alpha);
    applyStarburstOnCanvas(outCanvas, aperture, bladeCount);
}

export default {
    calculateLongExposureAlpha,
    applyDepthOfFieldFromVideo,
    applyStarburstOnCanvas,
    applyApertureEffects,
};
