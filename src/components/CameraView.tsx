import React, { useState } from "react";
import Webcam from "react-webcam";
import useCamera from "../hooks/useCamera";

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
		captured,
		settings,
		setIso,
		setAperture,
		setShutterSpeed,
		APERTURE_VALUES,
		ISO_VALUES,
		SHUTTER_VALUES,
	} = useCamera();

	const [notice, setNotice] = useState("");

	return (
		<div className="min-h-[100svh] w-full flex flex-col items-center text-white" style={{ background: 'linear-gradient(180deg,#0e0f10,#191a1b)' }}>
			{/* Top menu */}
			<div className="w-full flex items-center justify-between" style={{ height: '3.2rem' }}>
				<div className="flex items-center gap-3" style={{ paddingLeft: '0.5rem' }}>
					<a href="/" className="text-sm text-white/90">Home</a>
					<a href="/camera" className="text-sm text-white/90">Camera</a>
				</div>
				<div style={{ paddingRight: '0.5rem' }}>
					<button onClick={() => (isCameraOn ? stopCamera() : startCamera())} className="bg-white text-black px-3 py-1 rounded text-sm">
						{isCameraOn ? 'Camera Off' : 'Camera On'}
					</button>
				</div>
			</div>

			{/* Camera preview area (2:3 aspect) */}
			<div className="w-[80%] max-w-[360px] mt-1" style={{ aspectRatio: '2 / 3', position: 'relative' }}>
				<div className="absolute inset-0 rounded-md overflow-hidden border" style={{ borderColor: '#222', background: '#000' }}>
					{isCameraOn ? (
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
					) : (
						<div className="w-full h-full flex items-center justify-center text-gray-400">Camera Off</div>
					)}
				</div>
				{/* small overlay info */}
				<div style={{ position: 'absolute', left: '4%', bottom: '6%', width: '92%', display: 'flex', justifyContent: 'space-around', color: '#ffd54f', fontFamily: 'monospace', fontSize: '0.8rem' }}>
					<span>F{settings.aperture.toFixed(1)}</span>
					<span>SS 1/{Math.round(1 / settings.shutterSpeed)}</span>
					<span>ISO {settings.iso}</span>
				</div>
			</div>

			{/* Controls: sliders above capture button */}
			<div className="w-[80%] max-w-[360px] flex flex-col items-center mt-2" style={{ gap: '0.3rem' }}>
				<div className="w-full flex justify-between items-center" style={{ gap: '0.3rem' }}>
					<div className="text-white text-xs">F</div>
					{APERTURE_VALUES && (
						<input className="flex-1" type="range" min={0} max={APERTURE_VALUES.length - 1} step={1} value={Math.max(0, APERTURE_VALUES.indexOf(settings.aperture))} onChange={e => setAperture(APERTURE_VALUES[Number(e.target.value)])} style={{ accentColor: '#ff3b30' }} />
					)}
				</div>
				<div className="w-full flex justify-between items-center" style={{ gap: '0.3rem' }}>
					<div className="text-white text-xs">SS</div>
					{SHUTTER_VALUES && (
						<input className="flex-1" type="range" min={0} max={SHUTTER_VALUES.length - 1} step={1} value={Math.max(0, SHUTTER_VALUES.indexOf(settings.shutterSpeed))} onChange={e => setShutterSpeed(SHUTTER_VALUES[Number(e.target.value)])} style={{ accentColor: '#ff3b30' }} />
					)}
				</div>
				<div className="w-full flex justify-between items-center" style={{ gap: '0.3rem' }}>
					<div className="text-white text-xs">ISO</div>
					{ISO_VALUES && (
						<input className="flex-1" type="range" min={0} max={ISO_VALUES.length - 1} step={1} value={Math.max(0, ISO_VALUES.indexOf(settings.iso))} onChange={e => setIso(ISO_VALUES[Number(e.target.value)])} style={{ accentColor: '#ff3b30' }} />
					)}
				</div>
			</div>

			{/* Capture button area at bottom */}
			{notice && (
				<div style={{ width: '100%', textAlign: 'center', marginBottom: '0.4rem' }}>
					<span className="text-sm text-white/90">{notice}</span>
				</div>
			)}
			<div className="w-full flex items-center justify-center" style={{ height: '3.8rem', marginTop: 'auto', marginBottom: '0.6rem' }}>
				<button onClick={() => { setNotice('保存機能はこれから実装します'); setTimeout(() => setNotice(''), 1800); handleCapture(); }} aria-label="capture" title="Capture" style={{ width: '3.2rem', height: '3.2rem', borderRadius: '9999px', background: 'radial-gradient(circle at 30% 30%, #ffd54f, #ffb300)', border: '3px solid #fff', opacity: 0.6 }} />
			</div>

			{/* last capture preview (small) */}
			{captured && (
				<div className="w-[80%] max-w-[360px] mb-2" style={{ textAlign: 'center' }}>
					<img src={captured.image} alt="capture" style={{ width: '5.2rem', height: 'auto', border: '1px solid #333' }} />
				</div>
			)}
		</div>
	);
};

export default CameraView;