/**
 * Calculates the CSS blur amount based on the aperture F-value.
 */
export const calculateBlurAmount = (fValue: number): number => {
	if (fValue <= 1.4) return 8;
	if (fValue <= 2.0) return 6;
	if (fValue <= 2.8) return 4;
	if (fValue <= 4.0) return 2;
	if (fValue <= 5.6) return 1;
	return 0;
};

/**
 * Gets a note about the current shutter speed setting.
 */
export const getShutterNote = (shutterSpeed: number) => {
    const recip = Math.round(1 / shutterSpeed);
    if (recip >= 125) return '動体○';
    if (recip <= 60) return 'ブレに注意';
    return '';
};

/**
 * Gets a note about the current aperture setting.
 */
export const getApertureNote = (aperture: number) => {
    if (aperture >= 2.8 && aperture <= 4) return 'ボケやすい';
    if (aperture >= 4.5 && aperture <= 10) return 'バランス型';
    if (aperture >= 11 && aperture <= 16) return '光芒出現';
    return '';
};

/**
 * Gets a note about the current ISO setting.
 */
export const getIsoNote = (iso: number) => {
    if (iso >= 100 && iso <= 400) return '低ノイズ';
    if (iso >= 800 && iso <= 1600) return '中ノイズ';
    if (iso >= 3200 && iso <= 6400) return '高ノイズ';
    return '';
};

/**
 * Formats Shutter Speed for display.
 */
export const formatShutterSpeed = (shutterSpeed: number): string => {
    return shutterSpeed < 1 ? `1/${Math.round(1 / shutterSpeed)}` : `${shutterSpeed}`;
};

/**
 * Formats Aperture for display.
 */
export const formatAperture = (aperture: number): string => {
    return `F${aperture.toFixed(1)}`;
};
