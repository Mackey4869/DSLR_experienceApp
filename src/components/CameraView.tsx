import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import useCamera from "../hooks/useCamera";
import useFrameProcessor from "../hooks/useFrameProcessor";
import CircularDial from "./CircularDial";
import ExposureTriangle from "./ExposureTriangle";
import InfoScreen from "./InfoScreen"; 
import { GalleryScreen } from "./GalleryScreen"; 
import PhotoPreview from "./PhotoPreview";
import { 
    calculateBlurAmount, 
    getShutterNote, 
    getApertureNote, 
    getIsoNote, 
    formatShutterSpeed, 
    formatAperture 
} from "../utils/helpers";
import "../App.css";

const CameraView: React.FC = () => {
	const {
		webcamRef,
		isCameraOn,
		startCamera,
		stopCamera,
		videoConstraints,
		onUserMedia,
		onUserMediaError,
		computeFilter,
		computeBrightness,
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
	const starburstSpriteRef = useRef<HTMLCanvasElement | null>(null);
	const [capturedImage, setCapturedImage] = useState<string | null>(null);
	const [isFlashing, setIsFlashing] = useState(false);
	const [selectedMode, setSelectedMode] = useState<'ss'|'f'|'iso'>('ss');
	
	// [変更]: activeView 状態の追加 (デフォルトは 'camera')
	const [activeView, setActiveView] = useState<'camera' | 'info' | 'gallery'>('camera');
	const [isTryingMode, setIsTryingMode] = useState(false);
	const [notice] = useState("");

	// [追加]: タブ切り替え時のカメラ制御
	const handleViewChange = (view: 'camera' | 'info' | 'gallery') => {
		setActiveView(view);
		if (view !== 'camera') {
			stopCamera(); // カメラ以外の画面ではストリームを停止
			setIsTryingMode(false); // ビュー変更時にリセット
		}
	};

    // Frame processing logic moved to hook
    useFrameProcessor({
        webcamRef,
        overlayCanvasRef,
        containerRef,
        isCameraOn,
        settings,
        computeBrightness,
        starburstSpriteRef,
        lastTapRef
    });

	// Starburst sprite generation
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

	const ssList = SHUTTER_VALUES.map(v => formatShutterSpeed(v));
	const fList = APERTURE_VALUES.map(v => formatAperture(v));
	const isoList = ISO_VALUES.map(v => `${v}`);

	const currentSS = formatShutterSpeed(settings.shutterSpeed);
	const currentF = formatAperture(settings.aperture);
	const currentISO = `${settings.iso}`;

	const handleLabelClick = (type: 'SS' | 'F' | 'ISO') => {
		setSelectedMode(type.toLowerCase() as 'ss' | 'f' | 'iso');
	};

	const handlePreviewClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
		const video = webcamRef.current?.video;
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
	};

	const handleCapturePhoto = () => {
		const canvas = overlayCanvasRef.current;
		if (!canvas) return;

		setIsFlashing(true);
		setTimeout(() => setIsFlashing(false), 200);

		const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
		setCapturedImage(dataUrl);
		stopCamera();
	};

	return (
		<div className="camera-app-root">
			<header className="camera-header">
				<div className="ml-auto flex gap-2 pr-2">
					<button
						aria-label="gallery"
						onClick={() => handleViewChange('gallery')}
						className={`px-2 py-1.5 rounded-sm text-xs font-bold shadow-lg transition-colors ${
							activeView === 'gallery' ? 'bg-red-600 text-white' : 'bg-white text-black'
						}`}
					>
						Gallery
					</button>
					<button
						aria-label="info"
						onClick={() => handleViewChange('info')}
						className={`px-2 py-1.5 rounded-sm text-xs font-bold shadow-lg transition-colors ${
							activeView === 'info' ? 'bg-red-600 text-white' : 'bg-white text-black'
						}`}
					>
						Info
					</button>
					<button
						onClick={() => {
							if (activeView !== 'camera') {
								setActiveView('camera');
								startCamera();
							} else {
								if (isCameraOn) stopCamera();
								else startCamera();
							}
						}}
						className={`w-24 text-center px-2 py-1.5 rounded-sm text-xs font-bold shadow-lg transition-colors ${
							activeView === 'camera' && isCameraOn ? 'bg-red-600 text-white' : 'bg-white text-black'
						}`}
					>
						{activeView === 'camera' && isCameraOn ? 'Camera OFF' : 'Camera ON'}
					</button>
				</div>
			</header>

			<main className="camera-main">
				<div className="camera-preview-container" ref={containerRef}>
					{/* [変更]: activeView に応じた条件付きレンダリング */}
					{activeView === 'camera' ? (
						<>
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
											filter: `blur(${calculateBlurAmount(settings.aperture)}px)`,
											transition: 'filter 0.3s ease-in-out'
										}}
										onClick={handlePreviewClick}
									/>
								</>
							) : (
								<div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-neutral-900">
									<span className="text-lg font-medium tracking-widest opacity-70 italic">CAMERA_SIGNAL_LOST</span>
									<span className="text-sm mt-2 opacity-40 uppercase tracking-widest">Connect device to start preview</span>
								</div>
							)}
						</>
					) : activeView === 'info' ? (
						<InfoScreen />
					) : (
						<GalleryScreen 
							currentSS={currentSS}
							currentF={currentF}
							currentISO={currentISO}
							onTryModeChange={(isTrying) => setIsTryingMode(isTrying)}
						/>
					)}

					{/* Captured Image Preview within Display */}
					{capturedImage && (
						<PhotoPreview 
							image={capturedImage}
							settings={settings}
							onBack={() => {
								startCamera();
								setCapturedImage(null);
							}}
						/>
					)}

					{isFlashing && (
						<div className="absolute inset-0 bg-white z-[100] animate-pulse pointer-events-none" />
					)}
				</div>
			</main>

			<div className={`camera-info ${isTryingMode ? 'is-trying' : ''}`}>
				<div className="exposure-info-bar">
					<div className="exposure-item">
						<span className="exposure-label text-yellow-500">SS {formatShutterSpeed(settings.shutterSpeed)}</span>
						<span className="exposure-note text-yellow-500">{getShutterNote(settings.shutterSpeed)}</span>
					</div>
					<div className="exposure-item">
						<span className="exposure-label text-yellow-500">{formatAperture(settings.aperture)}</span>
						<span className="exposure-note text-yellow-500">{getApertureNote(settings.aperture)}</span>
					</div>
					<div className="exposure-item">
						<span className="exposure-label text-yellow-500">ISO {settings.iso}</span>
						<span className="exposure-note text-yellow-500">{getIsoNote(settings.iso)}</span>
					</div>
				</div>
			</div>

			<footer className="camera-footer">
				<div className="controls-layout">
					<div className="dial-section">
						<div className="relative w-full h-full">
							{['SS','F','ISO'].map((label, idx) => {
                                const angles = [-130, -90, -50];
                                const keys: Array<'ss'|'f'|'iso'> = ['ss','f','iso'];
								const theta = (angles[idx] * Math.PI) / 180;
								const x = Math.round(100 + 84 * Math.cos(theta));
								const y = Math.round(130 + 84 * Math.sin(theta));
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
							})}

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
							onClick={handleCapturePhoto}
							disabled={!isCameraOn || activeView !== 'camera'}
							className={`w-[72px] h-[72px] rounded-full bg-white border-[4px] border-neutral-300 active:scale-95 transition-transform flex items-center justify-center shadow-2xl ${(!isCameraOn || activeView !== 'camera') ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
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
		</div>
	);
};

export default CameraView;
