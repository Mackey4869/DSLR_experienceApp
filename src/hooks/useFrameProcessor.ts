import { useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import type { CameraSettings } from "./useCamera";
import { 
    applyDepthOfFieldFromVideo, 
    applyNoiseToCanvas,
    calculateLongExposureAlpha
} from "../utils/imageEffects";

interface FrameProcessorOptions {
    webcamRef: React.RefObject<Webcam | null>;
    overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isCameraOn: boolean;
    settings: CameraSettings;
    computeBrightness: (aperture: number, shutter: number, iso: number) => number;
    starburstSpriteRef: React.RefObject<HTMLCanvasElement | null>;
    lastTapRef: React.RefObject<{ x: number; y: number } | null>;
    processScale?: number;
}

export default function useFrameProcessor({
    webcamRef,
    overlayCanvasRef,
    containerRef,
    isCameraOn,
    settings,
    computeBrightness,
    starburstSpriteRef,
    lastTapRef,
    processScale = 0.5
}: FrameProcessorOptions) {
    const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const processFrame = useCallback(async () => {
        try {
            const video = webcamRef.current?.video;
            const canvas = overlayCanvasRef.current;
            const container = containerRef.current;
            if (!video || !canvas || !container || video.readyState < 2) return;

            const rect = container.getBoundingClientRect();
            const cw = rect.width;
            const ch = rect.height;
            const finalCw = Math.max(1, Math.floor(cw * processScale));
            const finalCh = Math.max(1, Math.floor(ch * processScale));

            if (canvas.width !== finalCw || canvas.height !== finalCh) {
                canvas.width = finalCw;
                canvas.height = finalCh;
            }

            const vw = video.videoWidth || 1;
            const vh = video.videoHeight || 1;
            const videoAspect = vw / vh;
            const canvasAspect = cw / ch;

            let sx: number, sy: number, sw: number, sh: number;
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

            const tap = lastTapRef.current;
            const tx = tap ? tap.x : sx + sw / 2;
            const ty = tap ? tap.y : sy + sh / 2;

            const brightness = computeBrightness(settings.aperture, settings.shutterSpeed, settings.iso);
            const currentSSStr = settings.shutterSpeed < 1 ? `1/${Math.round(1/settings.shutterSpeed)}` : `${settings.shutterSpeed}`;
            const { alpha } = calculateLongExposureAlpha(currentSSStr, 30);

            const relativeX = (tx - sx) * (canvas.width / sw);
            const relativeY = (ty - sy) * (canvas.height / sh);

            const ctx = canvas.getContext('2d')!;

            await applyDepthOfFieldFromVideo(video, canvas, relativeX, relativeY, settings.aperture, brightness, alpha);

            // Starburst processing
            if (settings.aperture >= 8 && starburstSpriteRef.current) {
                if (!detectionCanvasRef.current) {
                    detectionCanvasRef.current = document.createElement('canvas');
                    detectionCanvasRef.current.width = 64;
                    detectionCanvasRef.current.height = 64;
                }
                const detCanvas = detectionCanvasRef.current;
                const detCtx = detCanvas.getContext('2d', { willReadFrequently: true })!;
                
                detCtx.drawImage(video, sx, sy, sw, sh, 0, 0, detCanvas.width, detCanvas.height);
                const imgData = detCtx.getImageData(0, 0, detCanvas.width, detCanvas.height);
                const data = imgData.data;
                const threshold = 240;
                const brightPoints: {x: number, y: number}[] = [];

                for (let i = 0; i < data.length; i += 8) { // Skip pixels for speed
                    if (data[i] > threshold && data[i+1] > threshold && data[i+2] > threshold) {
                        const pixelIdx = i / 4;
                        const x = pixelIdx % detCanvas.width;
                        const y = Math.floor(pixelIdx / detCanvas.width);
                        brightPoints.push({ x, y });
                        if (brightPoints.length > 10) break;
                    }
                }

                if (brightPoints.length > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    
                    const fRatio = (settings.aperture - 8) / (16 - 8);
                    const starScale = 0.4 + fRatio * 0.8; 
                    ctx.globalAlpha = Math.min(1, 0.2 + fRatio * 0.4);

                    const sprite = starburstSpriteRef.current;
                    const sSize = sprite.width;

                    brightPoints.forEach(p => {
                        const targetX = (p.x / detCanvas.width) * canvas.width;
                        const targetY = (p.y / detCanvas.height) * canvas.height;
                        const drawSize = sSize * starScale;
                        ctx.drawImage(
                            sprite, 
                            targetX - drawSize / 2, 
                            targetY - drawSize / 2, 
                            drawSize, 
                            drawSize
                        );
                    });
                    ctx.restore();
                }
            }

            applyNoiseToCanvas(canvas, settings.iso, 1.0, 0.28);
        } catch (e) {
            console.warn('processFrame failed', e);
        }
    }, [webcamRef, overlayCanvasRef, containerRef, processScale, lastTapRef, settings, computeBrightness, starburstSpriteRef]);

    useEffect(() => {
        let mounted = true;
        let timer: number | null = null;

        const loop = () => {
            if (!mounted) return;
            processFrame().then(() => {
                if (mounted && isCameraOn) {
                    timer = window.setTimeout(() => {
                        requestAnimationFrame(loop);
                    }, 33);
                }
            });
        };

        if (isCameraOn) {
            loop();
        }

        return () => {
            mounted = false;
            if (timer) clearTimeout(timer);
        };
    }, [isCameraOn, processFrame]);
}
