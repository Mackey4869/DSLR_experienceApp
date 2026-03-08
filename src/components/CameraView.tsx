import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import useCamera from "../hooks/useCamera";
import { 
	applyApertureEffects, 
	applyFilmGrainOnCanvas, 
	applyColorNoiseOnCanvas,
	calculateLongExposureAlpha // [追加]: ヘルパーをインポート
} from "../utils/imageEffects";
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
				
				// [追加]: SS値に基づいた残像用のアルファ値を計算
				const currentSSStr = settings.shutterSpeed < 1 ? `1/${Math.round(1/settings.shutterSpeed)}` : `${settings.shutterSpeed}`;
				const { alpha } = calculateLongExposureAlpha(currentSSStr, 30);

				// マッピング計算
				const relativeX = (tx - sx) * (canvas.width / sw);
				const relativeY = (ty - sy) * (canvas.height / sh);

				// [追加]: alphaを渡して長秒露光をシミュレート
				await applyApertureEffects(video, canvas, relativeX, relativeY, settings.aperture, settings.bladeCount, brightness, alpha);
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
			{/* 1. Header: Settings and Info */}
			<header className="camera-header">
				<div className="flex gap-2">
					<button 
						onClick={() => (isCameraOn ? stopCamera() : startCamera())} 
						className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-colors ${
							isCameraOn ? 'bg-red-600 text-white' : 'bg-white text-black'
						}`}
					>
						{isCameraOn ? 'Camera OFF' : 'Camera ON'}
					</button>
				</div>
				<button aria-label="info" className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-colors ${isCameraOn ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
					Info
				</button>
			</header>

			{/* 2. Main: Camera Preview Area */}
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
						<div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-neutral-900">
							<span className="text-sm font-medium tracking-widest opacity-50">Camera_Off</span>
						</div>
					)}
				</div>
			</main>

			{/* 3. Info: Exposure Values Bar */}
			<div className="camera-info">
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
			</div>

			{/* 4. Footer: Controls */}
			<footer className="camera-footer">
				<div className="controls-layout">
					{/* Left: Dial Section */}
					<div className="dial-section">
						<div className="relative w-full h-full">
							{(() => {
								// compact layout: lower the dial and reduce its overall size so footer is more compact
								const centerX = 100;
								const centerY = 130; // moved slightly down
								const radius = 84;
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
											style={{ left: x - 24, top: y - 24, width: 48, height: 48 }}
											onClick={() => setSelectedMode(mode)}
										>
											<div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-neutral-800 text-gray-400 border border-white/5'}`}>
												{label}
											</div>
										</div>
									);
								});
							})()}

							<div className="absolute inset-0 pointer-events-none">
								<div className="absolute" style={{ left: 100 - 64, top: 130 - 64, width: 128, height: 128, pointerEvents: 'auto' }}>
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
							className="w-[72px] h-[72px] rounded-full bg-white border-[4px] border-neutral-300 active:scale-95 transition-transform flex items-center justify-center shadow-2xl"
						>
							<span className="material-symbols-outlined text-neutral-900 text-3xl">photo_camera</span>
						</button>
					</div>
				</div>
			</footer>

			{/* Status Overlay */}
			<div className="status-overlay">
				{notice && (
					<div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl">
						<span className="text-sm font-bold tracking-tight text-white">{notice}</span>
					</div>
				)}
			</div>
			
			{captured && (
				<div className="absolute bottom-4 right-4 p-1 bg-white rounded shadow-2xl z-[60] rotate-3 animate-in fade-in zoom-in duration-300">
					<img src={captured.image} alt="capture" className="w-16 h-auto rounded-sm" />
				</div>
			)}
		</div>
	);
};

export default CameraView;
