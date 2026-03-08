import { apertureToDof, apertureToStarburst, MAX_APERTURE } from './apertureSettings';

// [改善]: オフスクリーンノイズ描画用のキャッシュCanvas
let noiseCanvas: HTMLCanvasElement | null = null;

/**
 * ノイズテクスチャを1回だけ生成してキャッシュします。
 */
function getOrCreateNoiseCanvas(): HTMLCanvasElement {
    if (noiseCanvas) return noiseCanvas;

    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 512;
    noiseCanvas.height = 512;
    const ctx = noiseCanvas.getContext('2d')!;
    const imgData = ctx.createImageData(512, 512);

    for (let i = 0; i < imgData.data.length; i += 4) {
        // [改善]: 輝度を高く（180〜255）設定し、黒やグレーの粒子を排除して
        // 白っぽいノイズ（デジタルセンサーの輝度ノイズに近い質感）を生成します。
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

// Apply simple starburst (光芒) on top of an existing canvas
export function applyStarburstOnCanvas(outCanvas: HTMLCanvasElement, aperture: number, bladeCount: number) {
    const w = outCanvas.width;
    const h = outCanvas.height;
    const ctx = outCanvas.getContext('2d')!;

    const imgData = ctx.getImageData(0, 0, w, h);
    const startAperture = 9;
    const tAperture = Math.min(1, Math.max(0, (aperture - startAperture) / (MAX_APERTURE - startAperture)));
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

    brightPoints.sort((a, b) => b.intensity - a.intensity);
    const points = brightPoints.slice(0, 6);

    const { radianceR, lineWidth } = apertureToStarburst(aperture, bladeCount);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of points) {
        const cx = p.x;
        const cy = p.y;
        const rawAlpha = Math.min(0.7, Math.max(0, (p.intensity - threshold) / 60));
        const baseAlpha = rawAlpha * tAperture;

        for (let b = 0; b < bladeCount; b++) {
            const angle = (b / bladeCount) * Math.PI * 2;
            for (let layer = 0; layer < 5; layer++) {
                const t = layer / 5;
                const len = radianceR * (0.5 + 0.5 * (1 - t));
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255,240,200,${baseAlpha * (0.25 * (1 - t))})`;
                ctx.lineWidth = lineWidth * (0.8 - 0.5 * t);
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

/**
 * [改善]: ISO感度に基づいたノイズ描画 (高速版)
 * 暗い箇所でノイズが目立ち、明るい箇所では目立ちにくいデジタルセンサーの特性を再現します。
 */
export function applyFastNoiseOnCanvas(outCanvas: HTMLCanvasElement, iso: number, intensity = 1.0) {
    const w = outCanvas.width;
    const h = outCanvas.height;
    if (w === 0 || h === 0) return;

    // ISO 100以下ではノイズを描画しない
    if (iso <= 100) return;

    const ctx = outCanvas.getContext('2d')!;
    const noise = getOrCreateNoiseCanvas();

    // ISOとアルファ値の連動 (対数・累乗カーブ)
    // 高感度(ISO 3200〜)でより顕著になるよう調整
    const baseAlpha = Math.max(0, Math.pow(Math.log2(iso / 100) / 6, 2) * 0.5) * intensity;
    
    if (baseAlpha <= 0.005) return;

    ctx.save();

    // [改善]: 2つのブレンドモードを組み合わせてリアリティを向上

    // 1. 中間〜ハイライト用のベーステクスチャ (soft-light)
    // soft-light はハイライトを飛ばしすぎず、自然な質感を加えます
    ctx.globalAlpha = baseAlpha * 0.7;
    ctx.globalCompositeOperation = 'soft-light';
    for (let y = 0; y < h; y += noise.height) {
        for (let x = 0; x < w; x += noise.width) {
            ctx.drawImage(noise, x, y);
        }
    }

    // 2. シャドウ領域のノイズの浮き上がり (screen)
    // screen モードは背景が黒に近いほどノイズ成分が加算され、白に近いほど影響がなくなります。
    // これにより「暗部でノイズが目立つ」デジタルカメラの特性を再現します。
    ctx.globalAlpha = baseAlpha * 0.3; 
    ctx.globalCompositeOperation = 'screen';
    for (let y = 0; y < h; y += noise.height) {
        for (let x = 0; x < w; x += noise.width) {
            ctx.drawImage(noise, x, y);
        }
    }

    ctx.restore();
}

// [改善]: 従来の関数も高速版を使用するように変更し、互換性を維持
export function applyFilmGrainOnCanvas(outCanvas: HTMLCanvasElement, iso: number, intensity = 1) {
    applyFastNoiseOnCanvas(outCanvas, iso, intensity);
}

// [改善]: カラーノイズも統合。CameraView側で両方呼ばれることを考慮し、こちらは何もしないか、
// または微調整として残す。要件に基づき統合し、二重描画を避けるためこちらの実体は空にする。
export function applyColorNoiseOnCanvas(outCanvas: HTMLCanvasElement, iso: number, intensity = 0.3) {
    // 統合された applyFastNoiseOnCanvas がすでに呼ばれているため、ここでは何もしない。
    // (CameraView.tsx が両方を呼んでいるため、二重描画を防ぐ)
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
    alpha = 1.0 
) {
    await applyDepthOfFieldFromVideo(video, outCanvas, tapX, tapY, aperture, brightnessMultiplier, alpha);
    applyStarburstOnCanvas(outCanvas, aperture, bladeCount);
}

export default {
    calculateLongExposureAlpha,
    applyDepthOfFieldFromVideo,
    applyStarburstOnCanvas,
    applyApertureEffects,
    applyFastNoiseOnCanvas,
    applyFilmGrainOnCanvas,
    applyColorNoiseOnCanvas,
};
