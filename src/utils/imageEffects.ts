// Cache for off-screen noise canvas
let noiseCanvas: HTMLCanvasElement | null = null;

/**
 * Generates and caches a noise texture once.
 */
function getOrCreateNoiseCanvas(): HTMLCanvasElement {
    if (noiseCanvas) return noiseCanvas;

    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 512;
    noiseCanvas.height = 512;
    const ctx = noiseCanvas.getContext('2d')!;
    const imgData = ctx.createImageData(512, 512);

    for (let i = 0; i < imgData.data.length; i += 4) {
        // Higher luminance (180-255) to simulate digital sensor noise
        const val = 180 + Math.random() * 75;
        const r = val + (Math.random() - 0.5) * 20;
        const g = val + (Math.random() - 0.5) * 20;
        const b = val + (Math.random() - 0.5) * 20;

        imgData.data[i] = r;
        imgData.data[i + 1] = g;
        imgData.data[i + 2] = b;
        imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return noiseCanvas;
}

/**
 * Converts Shutter Speed string to numeric seconds and calculates alpha for long exposure.
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
    const alpha = Math.min(1.0, frameTime / ssValue);
    return { value: ssValue, alpha };
}

/**
 * Applies depth-of-field effect from a video source to a target canvas.
 */
export async function applyDepthOfFieldFromVideo(
    video: HTMLVideoElement, 
    outCanvas: HTMLCanvasElement, 
    _cx: number, 
    _cy: number, 
    _aperture: number, 
    brightnessMultiplier = 1,
    alpha = 1.0 
) {
    const vw = video.videoWidth || video.clientWidth;
    const vh = video.videoHeight || video.clientHeight;
    const cw = outCanvas.width;
    const ch = outCanvas.height;

    if (vw === 0 || vh === 0 || cw === 0 || ch === 0) return;

    const ctx = outCanvas.getContext('2d')!;

    if (alpha >= 1.0) {
        ctx.clearRect(0, 0, cw, ch);
    }

    const videoAspect = vw / vh;
    const canvasAspect = cw / ch;

    let sx, sy, sw, sh;
    if (videoAspect > canvasAspect) {
        sh = vh;
        sw = vh * canvasAspect;
        sx = (vw - sw) / 2;
        sy = 0;
    } else {
        sw = vw;
        sh = vw / canvasAspect;
        sx = 0;
        sy = (vh - sh) / 2;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = `brightness(${brightnessMultiplier})`;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.filter = 'none';
    ctx.restore();
}

/**
 * Applies ISO-based noise (Film Grain & Color Noise) to the canvas.
 */
export function applyNoiseToCanvas(outCanvas: HTMLCanvasElement, iso: number, grainIntensity = 1.0, colorIntensity = 0.3) {
    const w = outCanvas.width;
    const h = outCanvas.height;
    if (w === 0 || h === 0 || iso <= 100) return;

    const ctx = outCanvas.getContext('2d')!;
    const noise = getOrCreateNoiseCanvas();

    // Logarithmic curve for ISO sensitivity
    const baseAlpha = Math.max(0, Math.pow(Math.log2(iso / 100) / 6, 2) * 0.5);
    
    if (baseAlpha <= 0.005) return;

    ctx.save();

    // 1. Film Grain (Soft-light)
    ctx.globalAlpha = baseAlpha * 0.7 * grainIntensity;
    ctx.globalCompositeOperation = 'soft-light';
    for (let y = 0; y < h; y += noise.height) {
        for (let x = 0; x < w; x += noise.width) {
            ctx.drawImage(noise, x, y);
        }
    }

    // 2. Color/Shadow Noise (Screen)
    ctx.globalAlpha = baseAlpha * 0.3 * colorIntensity; 
    ctx.globalCompositeOperation = 'screen';
    for (let y = 0; y < h; y += noise.height) {
        for (let x = 0; x < w; x += noise.width) {
            ctx.drawImage(noise, x, y);
        }
    }

    ctx.restore();
}
