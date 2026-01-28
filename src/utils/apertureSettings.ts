// Aperture-related settings and helpers
export const MIN_APERTURE = 1.2;
export const MAX_APERTURE = 22;

export type DofParams = {
	radius: number; // pixels
	blurPx: number; // px value for canvas filter
};

export type StarburstParams = {
	radianceR: number; // length in pixels
	lineWidth: number; // base stroke width
	bladeCount: number; // number of blades (lines)
};

// Map aperture to depth-of-field parameters (radius + blur strength)
export function apertureToDof(aperture: number, canvasWidth: number, canvasHeight: number): DofParams {
    const w = Math.max(1, canvasWidth);
    const h = Math.max(1, canvasHeight);
    // enlarge the min/max radius to increase visible bokeh area
    const maxR = Math.min(w, h) * 0.60;
    const minR = Math.min(w, h) * 0.09;

    const t = Math.min(1, Math.max(0, (aperture - MIN_APERTURE) / (MAX_APERTURE - MIN_APERTURE)));
    // radius grows with aperture (f larger -> larger in-focus radius)
    const radius = minR + (maxR - minR) * t;

    // blur: small f -> stronger blur. Inverse mapping
    const maxBlur = 20; // px (strong blur)
    const minBlur = 0.5; // px (almost sharp)
    const blurPx = maxBlur - (maxBlur - minBlur) * t;

    return { radius, blurPx };
}

// Map aperture to starburst parameters
export function apertureToStarburst(aperture: number, bladeCount: number): StarburstParams {
    const t = Math.min(1, Math.max(0, (aperture - MIN_APERTURE) / (MAX_APERTURE - MIN_APERTURE)));
    const minLen = 30;
    const maxLen = 420;
    const radianceR = minLen + (maxLen - minLen) * t;

    const minWidth = 0.6;
    const maxWidth = 6.0;
    const lineWidth = minWidth + (maxWidth - minWidth) * t;

    return { radianceR, lineWidth, bladeCount };
}

export default {
    MIN_APERTURE,
    MAX_APERTURE,
    apertureToDof,
    apertureToStarburst,
};
