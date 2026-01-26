import { useCallback } from "react";
import { APERTURE_VALUES, ISO_VALUES, SHUTTER_VALUES, DEFAULT_APERTURE, DEFAULT_ISO, DEFAULT_SHUTTER } from "../utils/constants";
import { evAtISO100, evForISO, brightnessMultiplierFromEV } from "../utils/exposureCalc";

export function formatShutter(s: number) {
	if (s >= 1) return `${s.toFixed(0)}s`;
	const denom = Math.round(1 / s);
	return `1/${denom}`;
}

export function nearestIndex(arr: number[], value: number) {
	let best = 0;
	let bestDiff = Math.abs(arr[0] - value);
	for (let i = 1; i < arr.length; i++) {
		const d = Math.abs(arr[i] - value);
		if (d < bestDiff) { best = i; bestDiff = d; }
	}
	return best;
}

export default function useExposure() {
	const apertureValues = APERTURE_VALUES;
	const isoValues = ISO_VALUES;
	const shutterValues = SHUTTER_VALUES;

	const baselineEV = evAtISO100(DEFAULT_APERTURE, DEFAULT_SHUTTER);

	const computeEV = useCallback((aperture: number, shutter: number, iso: number) => {
		return evForISO(aperture, shutter, iso);
	}, []);

	const computeBrightness = useCallback((aperture: number, shutter: number, iso: number) => {
		const ev = computeEV(aperture, shutter, iso);
		return brightnessMultiplierFromEV(ev, baselineEV);
	}, [computeEV, baselineEV]);

	return {
		apertureValues,
		isoValues,
		shutterValues,
		computeEV,
		computeBrightness,
		formatShutter,
		nearestIndex,
	};
}