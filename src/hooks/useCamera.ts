import { useCallback, useEffect, useRef, useState } from "react";
import useExposure from "./useExposure";

type UseCameraResult = {
	webcamRef: React.RefObject<any>;
	isCameraOn: boolean;
	startCamera: () => void;
	stopCamera: () => void;
	handleCapture: () => { timestamp: string; settings: any; image: string | null } | null;
	videoConstraints: MediaTrackConstraints | undefined;
	onUserMedia: () => void;
	onUserMediaError: (err: any) => void;
	computeFilter: () => string;
	captured: any;
	settings: {
		iso: number;
		shutterSpeed: number;
		aperture: number;
		sensorSize: string;
		bladeCount: number;
	};
	setIso: (n: number) => void;
	setAperture: (n: number) => void;
	setShutterSpeed: (n: number) => void;
	APERTURE_VALUES: number[];
	ISO_VALUES: number[];
	SHUTTER_VALUES: number[];
};

const BASE_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
	facingMode: { ideal: "environment" },
	aspectRatio: 2 / 3,
	width: { ideal: 1280 },
	height: { ideal: 720 },
};

export default function useCamera(): UseCameraResult {
	const webcamRef = useRef<any>(null);
	const [isCameraOn, setIsCameraOn] = useState(false);
	const [useFacingMode, setUseFacingMode] = useState(true);

	const {
		apertureValues: APERTURE_VALUES,
		isoValues: ISO_VALUES,
		shutterValues: SHUTTER_VALUES,
		computeBrightness,
	} = useExposure();

	const [iso, _setIso] = useState(100);
	const [aperture, _setAperture] = useState(2.8);
	const [shutterSpeed, _setShutterSpeed] = useState(1 / 125);

	// helper to find nearest allowed value
	const nearest = (arr: number[], v: number) => {
		let best = arr[0];
		let bestDiff = Math.abs(arr[0] - v);
		for (let i = 1; i < arr.length; i++) {
			const d = Math.abs(arr[i] - v);
			if (d < bestDiff) { best = arr[i]; bestDiff = d; }
		}
		return best;
	};

	const setIso = (n: number) => {
		const v = nearest(ISO_VALUES, n);
		_setIso(v);
	};

	const setAperture = (n: number) => {
		const v = nearest(APERTURE_VALUES, n);
		_setAperture(v);
	};

	const setShutterSpeed = (n: number) => {
		const v = nearest(SHUTTER_VALUES, n);
		_setShutterSpeed(v);
	};
	const [sensorSize] = useState("24x36");
	const [bladeCount] = useState(9);

	// `setCaptured` is currently unused — keep captured state but omit setter
	const [captured] = useState<any>(null);

	const videoConstraints = useFacingMode ? BASE_VIDEO_CONSTRAINTS : { width: 1280, height: 720, aspectRatio: 2 / 3 };

	const computeFilter = useCallback(() => {
		const brightness = computeBrightness(aperture, shutterSpeed, iso);
		const contrast = 1.0;
		const blurPx = Math.max(0, (8 - aperture) * 0.3);
		return `brightness(${brightness}) contrast(${contrast}) blur(${blurPx}px)`;
	}, [computeBrightness, aperture, shutterSpeed, iso]);

	const onUserMedia = useCallback(() => {
		try {
			const v = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
			if (v) {
				v.muted = true;
				v.playsInline = true;
				v.autoplay = true;
				v.setAttribute('playsinline', '');
				v.setAttribute('muted', '');
				v.setAttribute('autoplay', '');
			}
		} catch (e) {
			console.warn('useCamera: failed to set video attributes', e);
		}
	}, []);

	const onUserMediaError = useCallback((err: any) => {
		console.warn('useCamera onUserMediaError', err);
		if (useFacingMode && err && /FacingMode|facingMode|Constraints|NotFoundError/i.test(String(err))) {
			setUseFacingMode(false);
		}
	}, [useFacingMode]);

	const startCamera = useCallback(() => {
		setIsCameraOn(true);
	}, []);

	const stopCamera = useCallback(() => {
		setIsCameraOn(false);
		try {
			const stream = webcamRef.current?.stream as MediaStream | undefined;
			if (stream) stream.getTracks().forEach(t => t.stop());
		} catch (e) {
			console.warn('useCamera: failed to stop tracks', e);
		}
	}, []);

	const handleCapture = useCallback(() => {
		// Capture disabled temporarily per request — no-op
		console.log('handleCapture: disabled');
		return null;
	}, []);

	useEffect(() => {
		return () => {
			try {
				const stream = webcamRef.current?.stream as MediaStream | undefined;
				if (stream) stream.getTracks().forEach(t => t.stop());
			} catch (e) {}
		};
	}, []);

	return {
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
		settings: { iso, shutterSpeed, aperture, sensorSize, bladeCount },
		setIso,
		setAperture,
		setShutterSpeed,
		APERTURE_VALUES,
		ISO_VALUES,
		SHUTTER_VALUES,
	};
}