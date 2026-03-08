import React, { useRef, useState, useEffect, useMemo } from "react";
import Webcam from "react-webcam";
import useCamera from "../hooks/useCamera";
import { 
	applyDepthOfFieldFromVideo, 
	applyFilmGrainOnCanvas, 
	applyColorNoiseOnCanvas,
	calculateLongExposureAlpha
} from "../utils/imageEffects";
import CircularDial from "./CircularDial";
import ExposureTriangle from "./ExposureTriangle";
import "../App.css";

// [追加]: F値連動ボケ計算ロジック
const calculateBlurAmount = (fValueString: string): number => {
	const fValue = parseFloat(fValueString.replace('F', ''));
	if (isNaN(fValue)) return 0;
	if (fValue <= 1.4) return 8;
	if (fValue <= 2.0) return 6;
	if (fValue <= 2.8) return 4;
	if (fValue <= 4.0) return 2;
	if (fValue <= 5.6) return 1;
	return 0;
};

const CameraView: React.FC = () => {
	const {
		webcamRef,
		isCameraOn,
		startCamera,
		stopCamera,
		// handleCapture, // [変更]: 内部でローカルの撮影ロジックを実装するため未使用に
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

	// [追加]: 撮影機能の状態管理
	const [capturedImage, setCapturedImage] = useState<string | null>(null);
	const [isFlashing, setIsFlashing] = useState(false);

	// 光芒処理用リソース
	const starburstSpriteRef = useRef<HTMLCanvasElement | null>(null);
	const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// 高品質な光芒スプライトの事前生成
	useEffect(() => {
		const spriteSize = 256;
		const canvas = document.createElement('canvas');
		canvas.width = spriteSize;
		canvas.height = spriteSize;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const cx = spriteSize / 2;
		const cy = spriteSize / 2;
		const bladeCount = settings.bladeCount || 6;

		const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spriteSize * 0.15);
		grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
		grad.addColorStop(0.4, 'rgba(255, 250, 230, 0.4)');
		grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy, spriteSize * 0.15, 0, Math.PI * 2);
		ctx.fill();

		for (let i = 0; i < bladeCount; i++) {
			const angle = (i * Math.PI * 2) / bladeCount;
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(angle);

			const rayLength = spriteSize * 0.4;
			const rayWidth = 2;
			const rayGrad = ctx.createLinearGradient(0, 0, rayLength, 0);
			rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
			rayGrad.addColorStop(0.2, 'rgba(255, 252, 240, 0.4)');
			rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

			ctx.fillStyle = rayGrad;
			ctx.beginPath();
			ctx.moveTo(0, -rayWidth / 2);
			ctx.lineTo(rayLength, 0); 
			ctx.lineTo(0, rayWidth / 2);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		starburstSpriteRef.current = canvas;
	}, [settings.bladeCount]);

	useEffect(() => {
		let mounted = true;
		let timer: number | null = null;

		async function processFrame() {
			try {
				const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
				const canvas = overlayCanvasRef.current;
				const container = containerRef.current;
				if (!video || !canvas || !container) return;

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

					for (let i = 0; i < data.length; i += 4 * 2) { 
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

				applyFilmGrainOnCanvas(canvas, settings.iso);
				applyColorNoiseOnCanvas(canvas, settings.iso, 0.28);
			} catch (e) {
				console.warn('processFrame failed', e);
			}
			if (!mounted) return;
			timer = window.setTimeout(() => { requestAnimationFrame(processFrame); }, 33);
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

			const tx = sx + (clickX / rect.width) * sw;
			const ty = sy + (clickY / rect.height) * sh;

			lastTapRef.current = { x: tx, y: ty };
		} catch (e) {
			console.warn('apply effects failed', e);
		}
	};

	// [追加]: 撮影機能（handleCapture）の実装
	const handleCapturePhoto = () => {
		const canvas = overlayCanvasRef.current;
		if (!canvas) return;

		// 1. フラッシュエフェクトの発動
		setIsFlashing(true);
		setTimeout(() => setIsFlashing(false), 200);

		// 2. Canvasから現在の描画内容（残像、光芒、ノイズ等）をキャプチャ
		// ※ CSSフィルタによるボケはここには含まれない
		const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
		setCapturedImage(dataUrl);
	};

	return (
		<div className="camera-app-root">
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
								style={{ 
									filter: `blur(${calculateBlurAmount(currentF)}px)`,
									transition: 'filter 0.3s ease-in-out'
								}}
								onClick={handlePreviewClick}
							/>
						</>
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-neutral-900">
							<span className="text-sm font-medium tracking-widest opacity-50">Camera_Off</span>
						</div>
					)}

					{/* [追加]: フラッシュエフェクト用オーバーレイ */}
					{isFlashing && (
						<div className="absolute inset-0 bg-white z-[100] animate-pulse pointer-events-none" />
					)}
				</div>
			</main>

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

			<footer className="camera-footer">
				<div className="controls-layout">
					<div className="dial-section">
						<div className="relative w-full h-full">
							{(() => {
								const centerX = 100;
								const centerY = 130;
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
							// [追加]: handleCapturePhoto を実行するように変更
							onClick={() => { handleCapturePhoto(); }}
							className="w-[72px] h-[72px] rounded-full bg-white border-[4px] border-neutral-300 active:scale-95 transition-transform flex items-center justify-center shadow-2xl"
						>
							<span className="material-symbols-outlined text-neutral-900 text-3xl">photo_camera</span>
						</button>
					</div>
				</div>
			</footer>

			<div className="status-overlay">
				{notice && (
					<div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl">
						<span className="text-sm font-bold tracking-tight text-white">{notice}</span>
					</div>
				)}
			</div>
			
			{/* 既存のミニプレビュー (captured) は残す (useCamera側の仕様に合わせる) */}
			{captured && (
				<div className="absolute bottom-4 right-4 p-1 bg-white rounded shadow-2xl z-[60] rotate-3 animate-in fade-in zoom-in duration-300">
					<img src={captured.image} alt="capture" className="w-16 h-auto rounded-sm" />
				</div>
			)}

			{/* [追加]: 撮影結果のフルスクリーンプレビューモーダル */}
			{capturedImage && (
				<div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
					<div className="relative w-full max-w-[500px] aspect-[2/3] bg-neutral-900 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
						<img 
							src={capturedImage} 
							alt="Captured" 
							className="w-full h-full object-cover"
							style={{ 
								// [重要]: キャプチャ時には反映されないCSSボケをプレビュー時に再適用
								filter: `blur(${calculateBlurAmount(currentF)}px)`,
							}}
						/>
						

						
						{/* 撮影データ表示 (装飾的UI) */}
						<div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
							<div className="flex items-center justify-between text-white/90">
								<div className="flex flex-col">
									<span className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-1">Exposure Settings</span>
									<div className="flex gap-4 font-mono text-sm font-bold">
										<span>{currentSS}</span>
										<span>{currentF}</span>
										<span>ISO {currentISO}</span>
									</div>
								</div>

							</div>
						</div>
					</div>
					
					<button 
						onClick={() => setCapturedImage(null)}
						className="mt-8 px-8 py-3 rounded-full bg-white text-black font-bold text-sm tracking-widest active:scale-95 transition-transform"
					>
						BACK TO CAMERA
					</button>
				</div>
			)}
		</div>
	);
};

export default CameraView;
