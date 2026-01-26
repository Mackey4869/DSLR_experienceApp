// EV（Exposure Value）や露出に関する純粋関数ユーティリティ

// EV (at ISO 100) = log2( (aperture^2) / shutter )
export function evAtISO100(aperture: number, shutterSeconds: number): number {
	return Math.log2((aperture * aperture) / shutterSeconds);
}

// EV adjusted for ISO relative to ISO 100: EV_iso = EV100 + log2(ISO/100)
export function evForISO(aperture: number, shutterSeconds: number, iso: number): number {
	const ev100 = evAtISO100(aperture, shutterSeconds);
	return ev100 + Math.log2(iso / 100);
}

// Convert EV to a simple brightness multiplier useful for CSS filter simulation
// We map EV change of +1 to brightness *2, -1 to *0.5, so multiplier = 2^(EV - baseline)
export function brightnessMultiplierFromEV(ev: number, baselineEV = evAtISO100(2.8, 1/125)): number {
	return Math.pow(2, ev - baselineEV);
}

export default {
	evAtISO100,
	evForISO,
	brightnessMultiplierFromEV,
};