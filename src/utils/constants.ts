// F値の刻み、ISOリスト、シャッタースピードリストなど
// 値は撮影機材で一般的に使われる刻みを想定（1/3 ストップに近い一覧）
export const APERTURE_VALUES = [
    2.8, 3.2, 3.5, 4.0,
    4.5, 5.0, 5.6, 6.3, 7.1, 8.0,
    9.0, 10.0, 11.0, 13.0, 14.0, 16.0,
];

export const ISO_VALUES = [100, 200, 400, 800, 1600, 3200, 6400];

// シャッタースピードを秒で表現（例: 1/125 -> 0.008)
export const SHUTTER_VALUES = [
	1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125,
	1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1,
];

export const DEFAULT_APERTURE = 2.8;
export const DEFAULT_ISO = 100;
export const DEFAULT_SHUTTER = 1 / 125;

export default {
	APERTURE_VALUES,
	ISO_VALUES,
	SHUTTER_VALUES,
	DEFAULT_APERTURE,
	DEFAULT_ISO,
	DEFAULT_SHUTTER,
};