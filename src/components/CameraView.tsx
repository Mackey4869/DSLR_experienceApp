import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import useCamera from "../hooks/useCamera";
import { applyApertureEffects, applyFilmGrainOnCanvas, applyColorNoiseOnCanvas } from "../utils/imageEffects";
import CircularDial from "./CircularDial";
import ExposureTriangle from "./ExposureTriangle";
import "../App.css";

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
	const containerRef = useRef<HTMLDivElement | null>(null);
	const lastTapRef = useRef<{ x: number; y: number } | null>(null);
	const PROCESS_SCALE = 0.5;

	useEffect(() => {
		let mounted = true;
		let timer: number | null = null;

		async function processFrame() {
			try {
				const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
				const canvas = overlayCanvasRef.current;
				const container = containerRef.current;
				if (!video || !canvas || !container) return;

				// コンテナの実測サイズに合わせてキャンバスを調整
				const rect = container.getBoundingClientRect();
				const cw = rect.width;
				const ch = rect.height;

				const finalCw = Math.max(1, Math.floor(cw * PROCESS_SCALE));
				const finalCh = Math.max(1, Math.floor(ch * PROCESS_SCALE));

				if (canvas.width !== finalCw || canvas.height !== finalCh) {
					canvas.width = finalCw;
					canvas.height = finalCh;
				}

				const vw = video.videoWidth || 1;
				const vh = video.videoHeight || 1;
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

				const tap = lastTapRef.current;
				const tx = tap ? tap.x : sx + sw / 2;
				const ty = tap ? tap.y : sy + sh / 2;

				const brightness = computeBrightness(settings.aperture, settings.shutterSpeed, settings.iso);
				
				// マッピング計算
				const relativeX = (tx - sx) * (canvas.width / sw);
				const relativeY = (ty - sy) * (canvas.height / sh);

				await applyApertureEffects(video, canvas, relativeX, relativeY, settings.aperture, settings.bladeCount, brightness);
				applyFilmGrainOnCanvas(canvas, settings.iso);
				applyColorNoiseOnCanvas(canvas, settings.iso, 0.28);
			} catch (e) {
				console.warn('processFrame failed', e);
			}
			if (!mounted) return;
			timer = window.setTimeout(() => { requestAnimationFrame(processFrame); }, 33); // 30fps
		}

		if (isCameraOn) processFrame();
		return () => { mounted = false; if (timer) clearTimeout(timer); };
	}, [isCameraOn, settings.aperture, settings.bladeCount, settings.iso, settings.shutterSpeed, computeBrightness]);

	const [selectedMode, setSelectedMode] = useState<'ss'|'f'|'iso'>('ss');
	const [notice, setNotice] = useState("");

	const getShutterNote = () => {
		const recip = Math.round(1 / settings.shutterSpeed);
		if (recip >= 125) return '動体○';
		if (recip <= 60) return 'ブレに注意';
		return '';
	};

	const getApertureNote = () => {
		const a = settings.aperture;
		if (a >= 2.8 && a <= 4) return 'ボケやすい';
		if (a >= 4.5 && a <= 10) return 'バランス型';
		if (a >= 11 && a <= 16) return '光芒出現';
		return '';
	};

	const getIsoNote = () => {
		const iso = settings.iso;
		if (iso >= 100 && iso <= 400) return '低ノイズ';
		if (iso >= 800 && iso <= 1600) return '中ノイズ';
		if (iso >= 3200 && iso <= 6400) return '高ノイズ';
		return '';
	};

	const ssList = SHUTTER_VALUES.map(v => v < 1 ? `1/${Math.round(1/v)}` : `${v}`);
	const fList = APERTURE_VALUES.map(v => `F${v.toFixed(1)}`);
	const isoList = ISO_VALUES.map(v => `${v}`);

	const currentSS = settings.shutterSpeed < 1 ? `1/${Math.round(1/settings.shutterSpeed)}` : `${settings.shutterSpeed}`;
	const currentF = `F${settings.aperture.toFixed(1)}`;
	const currentISO = `${settings.iso}`;

	const handleLabelClick = (type: 'SS' | 'F' | 'ISO') => {
		setSelectedMode(type.toLowerCase() as 'ss' | 'f' | 'iso');
	};

	const handlePreviewClick = async (ev: React.MouseEvent<HTMLCanvasElement>) => {
		try {
			const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
			const canvas = overlayCanvasRef.current;
			if (!video || !canvas) return;

			const rect = canvas.getBoundingClientRect();
			const clickX = ev.clientX - rect.left;
			const clickY = ev.clientY - rect.top;

			const vw = video.videoWidth || 1;
			const vh = video.videoHeight || 1;
			const canvasAspect = rect.width / rect.height;
			const videoAspect = vw / vh;

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

			const tx = sx + (clickX / rect.width) * sw;
			const ty = sy + (clickY / rect.height) * sh;

			lastTapRef.current = { x: tx, y: ty };
		} catch (e) {
			console.warn('apply effects failed', e);
		}
	};

	return (
		<div className="camera-app-root">
			{/* Header */}
			<header className="camera-header">
				<button 
					onClick={() => (isCameraOn ? stopCamera() : startCamera())} 
					className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
				>
					{isCameraOn ? 'Camera OFF' : 'Camera ON'}
				</button>
			</header>

			{/* Main Camera Area */}
			<main className="camera-main">
				<div className="camera-preview-container" ref={containerRef}>
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
							<canvas
								ref={overlayCanvasRef}
								className="absolute inset-0 w-full h-full cursor-crosshair"
								onClick={handlePreviewClick}
							/>
						</>
					) : (
						<div className="w-full h-full flex items-center justify-center text-gray-500 bg-neutral-900">
							<span className="material-symbols-outlined text-4xl mb-2">videocam_off</span>
						</div>
					)}
				</div>
			</main>

			{/* Footer: Values and Controls */}
			<footer className="camera-footer">
				{/* Exposure Values Bar */}
				<div className="exposure-info-bar">
					<div className="exposure-item">
						<span className="exposure-label">SS 1/{Math.round(1 / settings.shutterSpeed)}</span>
						<span className="exposure-note">{getShutterNote()}</span>
					</div>
					<div className="exposure-item">
						<span className="exposure-label">F{settings.aperture.toFixed(1)}</span>
						<span className="exposure-note">{getApertureNote()}</span>
					</div>
					<div className="exposure-item">
						<span className="exposure-label">ISO {settings.iso}</span>
						<span className="exposure-note">{getIsoNote()}</span>
					</div>
				</div>

				{/* Controls Layout */}
				<div className="controls-layout">
					{/* Left: Dial */}
					<div className="dial-section">
						<div className="relative w-full h-full">
							{(() => {
								const centerX = 110;
								const centerY = 140;
								const radius = 94;
								const angles = [-130, -90, -50];
								const keys: Array<'ss'|'f'|'iso'> = ['ss','f','iso'];
								return ['SS','F','ISO'].map((label, idx) => {
									const theta = (angles[idx] * Math.PI) / 180;
									const x = Math.round(centerX + radius * Math.cos(theta));
									const y = Math.round(centerY + radius * Math.sin(theta));
									const mode = keys[idx];
									const isActive = selectedMode === mode;
									return (
										<div
											key={label}
											className="absolute flex items-center justify-center z-30 cursor-pointer"
											style={{ left: x - 28, top: y - 28, width: 56, height: 56 }}
											onClick={() => setSelectedMode(mode)}
										>
											<div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all ${isActive ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-neutral-800 border border-white/10'}`}>
												{label}
											</div>
										</div>
									);
								});
							})()}

							<div className="absolute inset-0 pointer-events-none">
								<div className="absolute" style={{ left: 110 - 64, top: 140 - 64, width: 128, height: 128, pointerEvents: 'auto' }}>
									{selectedMode === 'f' && <CircularDial value={settings.aperture} onChange={setAperture} label="Aperture" values={APERTURE_VALUES} />}
									{selectedMode === 'ss' && <CircularDial value={settings.shutterSpeed} onChange={setShutterSpeed} label="Shutter" values={SHUTTER_VALUES} />}
									{selectedMode === 'iso' && <CircularDial value={settings.iso} onChange={setIso} label="ISO" values={ISO_VALUES} />}
								</div>
							</div>
						</div>
					</div>

					{/* Right: Shutter and Triangle */}
					<div className="shutter-section">
						<div className="triangle-container">
							<ExposureTriangle
								ssList={ssList}
								fList={fList}
								isoList={isoList}
								currentSS={currentSS}
								currentF={currentF}
								currentISO={currentISO}
								onLabelClick={handleLabelClick}
							/>
						</div>
						<button 
							onClick={() => { setNotice('保存機能はこれから実装します'); setTimeout(() => setNotice(''), 1800); handleCapture(); }}
							className="w-[76px] h-[76px] rounded-full bg-white border-[4px] border-neutral-300 active:scale-95 transition-transform flex items-center justify-center shadow-xl"
						>
							<span className="material-symbols-outlined text-neutral-900 text-3xl">photo_camera</span>
						</button>
					</div>
				</div>
			</footer>

			{/* Status Overlay */}
			<div className="status-overlay">
				{notice && (
					<div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
						<span className="text-sm font-medium">{notice}</span>
					</div>
				)}
				{captured && (
					<div className="p-1 bg-white rounded shadow-2xl">
						<img src={captured.image} alt="capture" className="w-20 h-auto rounded-sm" />
					</div>
				)}
			</div>
		</div>
	);
};

export default CameraView;
