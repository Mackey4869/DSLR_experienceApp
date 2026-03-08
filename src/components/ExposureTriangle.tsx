import React, { useState, useMemo } from 'react';

interface ExposureTriangleProps {
  ssList: string[];
  fList: string[];
  isoList: string[];
  currentSS: string;
  currentF: string;
  currentISO: string;
  onLabelClick: (type: 'SS' | 'F' | 'ISO') => void;
}

/**
 * 露出の三角形（レーダーチャート型）コンポーネント
 * SS, F値, ISO のバランスを視覚化し、タップで学習用ポップアップを表示します。
 */
const ExposureTriangle: React.FC<ExposureTriangleProps> = ({
  ssList,
  fList,
  isoList,
  currentSS,
  currentF,
  currentISO,
  onLabelClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // SVGの中心と半径の設定
  const centerX = 50;
  const centerY = 55; // ラベルのために少し下にずらす
  const radius = 35;

  // 各頂点の角度 (ISO: 真上, SS: 左下, F: 右下)
  const angles = {
    ISO: -Math.PI / 2,         // -90度 (真上)
    SS: (5 * Math.PI) / 6,    // 150度 (左下)
    F: Math.PI / 6,           // 30度 (右下)
  };

  // 値のインデックスから位置（0.0 〜 1.0）を計算するヘルパー
  const getValueRatio = (list: string[], current: string) => {
    const index = list.indexOf(current);
    if (index === -1 || list.length <= 1) return 0;
    return index / (list.length - 1);
  };

  // 割合に基づいて座標を計算する
  const getPoint = (angle: number, ratio: number) => {
    // 最小値を 0.1 程度にして、中心が完全な点にならないようにする
    const adjustedRatio = 0.1 + ratio * 0.9;
    const x = centerX + radius * adjustedRatio * Math.cos(angle);
    const y = centerY + radius * adjustedRatio * Math.sin(angle);
    return `${x},${y}`;
  };

  // 外枠の頂点座標
  const outerPoints = [
    { type: 'ISO', x: centerX + radius * Math.cos(angles.ISO), y: centerY + radius * Math.sin(angles.ISO) },
    { type: 'SS', x: centerX + radius * Math.cos(angles.SS), y: centerY + radius * Math.sin(angles.SS) },
    { type: 'F', x: centerX + radius * Math.cos(angles.F), y: centerY + radius * Math.sin(angles.F) },
  ] as const;

  // 内側のポリゴンのポイント文字列を作成
  const innerPolygonPoints = useMemo(() => {
    const p1 = getPoint(angles.ISO, getValueRatio(isoList, currentISO));
    const p2 = getPoint(angles.SS, getValueRatio(ssList, currentSS));
    // F値はインデックスが大きいほど（F22など）暗いため、比率を反転
    const ratioF = getValueRatio(fList, currentF);
    const p3 = getPoint(angles.F, 1 - ratioF);
    return `${p1} ${p2} ${p3}`;
  }, [isoList, currentISO, ssList, currentSS, fList, currentF]);

  return (
    <>
      <div className="w-full aspect-square relative select-none">
        <svg
          viewBox="0 0 100 110"
          className="w-full h-full drop-shadow-lg"
          style={{ overflow: 'visible' }}
        >
          {/* ガイド線（各軸） */}
          <g stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5">
            {outerPoints.map((pt, i) => (
              <line key={i} x1={centerX} y1={centerY} x2={pt.x} y2={pt.y} />
            ))}
          </g>

          {/* 外枠の三角形 */}
          <polygon
            points={outerPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="rgba(255, 255, 255, 0.05)"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* 内側のポリゴン（現在の設定値） */}
          <polygon
            points={innerPolygonPoints}
            fill="rgba(255, 255, 255, 0.8)"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={{
              transition: 'all 0.3s ease-out'
            }}
          />

          {/* 中央のタップ判定（ポップアップ表示用） */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="transparent"
            onClick={() => setIsOpen(true)}
            className="cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />

          {/* ラベル（モード切り替え用） */}
          {outerPoints.map((pt) => {
            const offset = 14;
            const lx = centerX + (radius + offset) * Math.cos(angles[pt.type]);
            const ly = centerY + (radius + offset) * Math.sin(angles[pt.type]);

            return (
              <g
                key={pt.type}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); // 中央のcircleのonClickを発火させない
                  onLabelClick(pt.type);
                }}
              >
                <circle cx={lx} cy={ly} r="12" fill="transparent" />
                <text
                  x={lx}
                  y={ly}
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="transition-opacity active:opacity-50"
                >
                  {pt.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 学習用ポップアップ */}
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-6 z-[2000] backdrop-blur-sm bg-black/70"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-[#222] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white text-lg font-bold mb-4">💡 露出の三角形</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              中の白い三角形の面積は、写真に取り込む光の量を表します。
              <br /><br />
              三角形が<span className="text-white font-bold">大きいほど明るい写真</span>になり、
              <span className="text-white font-bold">小さいほど暗い写真</span>になります。
              <br /><br />
              SS、F、ISOのバランスを調整して、最適な面積（露出）を見つけましょう。
            </p>
            <button 
              onClick={() => setIsOpen(false)}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors w-full"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ExposureTriangle;
