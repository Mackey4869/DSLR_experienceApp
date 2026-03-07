import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import useCamera from "../hooks/useCamera";
import { applyApertureEffects, applyFilmGrainOnCanvas, applyColorNoiseOnCanvas } from "../utils/imageEffects";
import CircularDial from "./CircularDial";

// UI 層: レイアウトとコントロールのみを担当。カメラ制御は hook に移譲。
const CameraView: React.FC = () => {
	const {
		webcamRef,
		isCameraOn,
		startCamera,
		stopCamera,
		handleCapture,
		videoConstraints,
		onUserMedia,
		onUserMediaError,
		computeFilter,
		computeBrightness,
		captured,
		settings,
		setIso,
		setAperture,
		setShutterSpeed,
		APERTURE_VALUES,
		ISO_VALUES,
		SHUTTER_VALUES,
	} = useCamera();

	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// store last tap in video pixel coordinates; if null use center
	const lastTapRef = useRef<{ x: number; y: number } | null>(null);

	// processing scale: reduce internal canvas resolution for performance (0.0-1.0)
	const PROCESS_SCALE = 0.5;

	useEffect(() => {
		let mounted = true;
		let timer: number | null = null;

		async function processFrame() {
			try {
				const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
				const canvas = overlayCanvasRef.current;
				if (!video || !canvas) return;

				// ensure canvas internal size matches scaled video size
				const vw = video.videoWidth || Math.max(1, video.clientWidth);
				const vh = video.videoHeight || Math.max(1, video.clientHeight);
				const cw = Math.max(1, Math.floor(vw * PROCESS_SCALE));
				const ch = Math.max(1, Math.floor(vh * PROCESS_SCALE));
				if (canvas.width !== cw || canvas.height !== ch) {
					canvas.width = cw;
					canvas.height = ch;
				}

				const tap = lastTapRef.current;
				const tx = tap ? tap.x : vw / 2;
				const ty = tap ? tap.y : vh / 2;
				const sx = canvas.width / vw;
				const sy = canvas.height / vh;
				const brightness = computeBrightness(settings.aperture, settings.shutterSpeed, settings.iso);
				await applyApertureEffects(video, canvas, tx * sx, ty * sy, settings.aperture, settings.bladeCount, brightness);
				// apply film-like luminance noise depending on ISO
				applyFilmGrainOnCanvas(canvas, settings.iso);
				// add light color noise (chrominance)
				applyColorNoiseOnCanvas(canvas, settings.iso, 0.28);
			} catch (e) {
				console.warn('processFrame failed', e);
			}
			if (!mounted) return;
			// schedule next run (throttle to ~3fps)
			timer = window.setTimeout(() => { requestAnimationFrame(processFrame); }, 330);
		}

		if (isCameraOn) processFrame();
		return () => { mounted = false; if (timer) clearTimeout(timer); };
	}, [isCameraOn, settings.aperture, settings.bladeCount, settings.iso, settings.shutterSpeed, computeBrightness]);

	const [selectedMode, setSelectedMode] = useState<'ss'|'f'|'iso'>('ss');
	const [notice, setNotice] = useState("");

	return (
		<div className="min-h-[100svh] w-full flex flex-col items-center text-white" style={{ background: 'linear-gradient(180deg,#0e0f10,#191a1b)' }}>
			{/* Top menu (no navigation links) */}
			<div className="w-full flex items-center justify-end" style={{ height: '3.2rem', paddingRight: '0.5rem' }}>
				<button onClick={() => (isCameraOn ? stopCamera() : startCamera())} className="bg-white text-black px-3 py-1 rounded text-sm">
					{isCameraOn ? 'Camera Off' : 'Camera On'}
				</button>
			</div>

			{/* Camera preview area (2:3 aspect) */}
			<div className="w-[80%] max-w-[360px] mt-1" style={{ aspectRatio: '2 / 3', position: 'relative' }}>
				<div className="absolute inset-0 rounded-md overflow-hidden border" style={{ borderColor: '#222', background: '#000' }}>
					{isCameraOn ? (
						<>
							<Webcam
								ref={webcamRef}
								audio={false}
								screenshotFormat="image/jpeg"
								videoConstraints={videoConstraints}
								mirrored={false}
								className="w-full h-full object-cover"
								style={{ filter: computeFilter() }}
								playsInline
								onUserMedia={onUserMedia}
								onUserMediaError={onUserMediaError}
							/>
							{/* overlay canvas for processed preview */}
							<canvas
								ref={overlayCanvasRef}
								className="absolute inset-0 w-full h-full"
								style={{ width: '100%', height: '100%', position: 'absolute', left: 0, top: 0, pointerEvents: 'auto' }}
								onClick={async (ev) => {
									try {
										const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
										const canvas = overlayCanvasRef.current;
										if (!video || !canvas) return;
										// compute click pos relative to element and scale to video pixels
										const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
										const clickX = ev.clientX - rect.left;
										const clickY = ev.clientY - rect.top;
										// scale to video natural size
										const sx = video.videoWidth / rect.width;
										const sy = video.videoHeight / rect.height;
										const tx = clickX * sx;
										const ty = clickY * sy;
										lastTapRef.current = { x: tx, y: ty };
										const brightness = computeBrightness(settings.aperture, settings.shutterSpeed, settings.iso);
										await applyApertureEffects(video, canvas, tx, ty, settings.aperture, settings.bladeCount, brightness);
										// apply film-like luminance noise depending on ISO
										applyFilmGrainOnCanvas(canvas, settings.iso);
										// add light color noise (chrominance)
										applyColorNoiseOnCanvas(canvas, settings.iso, 0.28);
									} catch (e) {
										console.warn('apply effects failed', e);
									}
								}}
							/>
						</>
					) : (
						<div className="w-full h-full flex items-center justify-center text-gray-400">Camera Off</div>
					)}
				</div>
				{/* small overlay info */}
				<div style={{ position: 'absolute', left: '4%', bottom: '6%', width: '92%', display: 'flex', justifyContent: 'space-around', color: '#ffffff', fontFamily: 'monospace', fontSize: '0.8rem' }}>
					<span>F{settings.aperture.toFixed(1)}</span>
					<span>SS 1/{Math.round(1 / settings.shutterSpeed)}</span>
					<span>ISO {settings.iso}</span>
				</div>
			</div>


			{/* Controls: single dial at bottom-left with 3 arc-buttons (SS, F, ISO) */}
			<div style={{ position: 'absolute', left: 12, bottom: 12, width: 220, height: 220 }}>
				<div style={{ position: 'relative', width: '100%', height: '100%' }}>
					{/* dial center coordinates (relative to this container) */}
					{(() => {
						const centerX = 110; // px from left
						const centerY = 140; // px from top
						const radius = 94; // distance from center to button
						const angles = [-130, -90, -50]; // degrees: SS (top-left), F (top-center), ISO (top-right)
						const keys: Array<'ss'|'f'|'iso'> = ['ss','f','iso'];
						return ['SS','F','ISO'].map((label, idx) => {
							const theta = (angles[idx] * Math.PI) / 180;
							const x = Math.round(centerX + radius * Math.cos(theta));
							const y = Math.round(centerY + radius * Math.sin(theta));
							const mode = keys[idx];
							const isActive = selectedMode === mode;
							return (
								// larger wrapper for easier tapping (56x56) with visual circle inside
								<div
									key={label}
									style={{ position: 'absolute', left: x - 28, top: y - 28, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}
									onClick={() => setSelectedMode(mode)}
									role="button"
									aria-label={label}
								>
									<div style={{ width: 44, height: 44, borderRadius: 9999, background: isActive ? '#ff3b30' : '#2b2b2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, boxShadow: isActive ? '0 6px 18px rgba(255,59,48,0.18)' : 'none', border: '2px solid rgba(255,255,255,0.06)' }}>
										<span>{label}</span>
									</div>
								</div>
							);
						});
					})()}

					{/* dial itself - positioned using center coords so buttons align */}
					<div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
						<div style={{ position: 'absolute', left: 110 - 64, top: 140 - 64, width: 128, height: 128, pointerEvents: 'auto' }}>
							{(() => {
								if (selectedMode === 'f' && APERTURE_VALUES) {
									return <CircularDial value={settings.aperture} onChange={(v) => setAperture(v)} label="Aperture" values={APERTURE_VALUES} />;
								}
								if (selectedMode === 'ss' && SHUTTER_VALUES) {
									return <CircularDial value={settings.shutterSpeed} onChange={(v) => setShutterSpeed(v)} label="Shutter" values={SHUTTER_VALUES} />;
								}
								if (selectedMode === 'iso' && ISO_VALUES) {
									return <CircularDial value={settings.iso} onChange={(v) => setIso(v)} label="ISO" values={ISO_VALUES} />;
								}
								if (APERTURE_VALUES) return <CircularDial value={settings.aperture} onChange={(v) => setAperture(v)} label="Aperture" values={APERTURE_VALUES} />;
								return null;
							})()}
						</div>
					</div>
				</div>
			</div>

			{/* Capture (shutter) button at bottom-right */}
			<div style={{ position: 'absolute', right: 48, bottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
				{/* add space above the shutter button */}
				<div style={{ height: 48 }} />
				<button onClick={() => { setNotice('保存機能はこれから実装します'); setTimeout(() => setNotice(''), 1800); handleCapture(); }} aria-label="capture" title="Capture" style={{ width: 76, height: 76, borderRadius: 9999, background: 'radial-gradient(circle at 30% 30%, #ffffff, #ffffff)', border: '4px solid #fff', opacity: 0.98, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<span className="material-symbols-outlined" style={{ fontSize: '2rem', lineHeight: 1, color: '#111' }}>photo_camera</span>
				</button>
			</div>

			{/* notice and last capture preview remain at bottom center (small) */}
			{notice && (
				<div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 110, width: '100%', textAlign: 'center' }}>
					<span className="text-sm text-white/90">{notice}</span>
				</div>
			)}
			{captured && (
				<div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 56 }}>
					<img src={captured.image} alt="capture" style={{ width: '5.2rem', height: 'auto', border: '1px solid #333' }} />
				</div>
			)}
		</div>
	);
};

export default CameraView;