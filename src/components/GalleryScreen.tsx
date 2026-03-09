import React, { useState, useMemo, useEffect } from 'react';
import { evForISO, brightnessMultiplierFromEV } from '../utils/exposureCalc';

// --- 型定義 ---
type ExposureSettings = {
  ss: string;  // シャッタースピード (例: "1/125", "30\"")
  f: string;   // F値 (例: "f/2.8")
  iso: string; // ISO感度 (例: "100")
};

type PhotoData = {
  id: string;
  imageUrl: string;
  settings: ExposureSettings;
} | null;

// [変更]: Propsの追加
interface GalleryScreenProps {
  currentSS: string;
  currentF: string;
  currentISO: string;
  onTryModeChange: (isTrying: boolean) => void;
}

// --- モックデータの生成 ---
const GENERATE_MOCK_DATA = (): PhotoData[] => {
  const dummyPhotos: PhotoData[] = [
    {
      id: '1',
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
      settings: { ss: '1/1000', f: 'f/2.8', iso: '100' },
    },
    {
      id: '2',
      imageUrl: 'https://images.unsplash.com/photo-1493246507139-91e8bef99c02?w=800&q=80',
      settings: { ss: '1/60', f: 'f/8.0', iso: '400' },
    },
    {
      id: '3',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
      settings: { ss: '30"', f: 'f/11', iso: '100' },
    },
    {
      id: '4',
      imageUrl: 'https://images.unsplash.com/photo-1500622388414-8055b16410e4?w=800&q=80',
      settings: { ss: '1/250', f: 'f/1.8', iso: '800' },
    },
    {
      id: '5',
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
      settings: { ss: '1/4000', f: 'f/4.0', iso: '200' },
    },
  ];

  const totalSlots = 30;
  const remainingSlots = totalSlots - dummyPhotos.length;
  const emptySlots = Array(remainingSlots).fill(null);

  return [...dummyPhotos, ...emptySlots];
};

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ 
  currentSS, 
  currentF, 
  currentISO, 
  onTryModeChange 
}) => {
  // [変更]: 状態管理の追加 (ポップアップ用と試すモード用)
  const [selectedPhotoForPopup, setSelectedPhotoForPopup] = useState<PhotoData | null>(null);
  const [tryingPhoto, setTryingPhoto] = useState<PhotoData | null>(null);
  
  const galleryData = useMemo(() => GENERATE_MOCK_DATA(), []);

  // [変更]: 試すモードの切り替えを親に通知
  useEffect(() => {
    onTryModeChange(tryingPhoto !== null);
  }, [tryingPhoto, onTryModeChange]);

  // --- ヘルパー: 設定値の数値化 ---
  const getValues = () => {
    // SS: "1/125" -> 0.008, "30\"" -> 30
    let ssNum = 1/125;
    if (currentSS.includes('/')) {
      const [n, d] = currentSS.split('/').map(Number);
      ssNum = n / d;
    } else {
      ssNum = parseFloat(currentSS.replace('"', ''));
    }
    
    const fNum = parseFloat(currentF.replace('f/', ''));
    const isoNum = parseInt(currentISO);
    
    return { ssNum, fNum, isoNum };
  };

  // [変更]: リアルタイムエフェクトの計算 (試すモード用)
  const visualEffects = useMemo(() => {
    if (!tryingPhoto) return {};
    
    const { ssNum, fNum, isoNum } = getValues();
    const currentEV = evForISO(fNum, ssNum, isoNum);
    
    // 基準となる明るさ（このモック写真が適正露出だったと仮定）からの差分
    // ここでは f/5.6, 1/125, ISO 100 を基準（適正）としてシミュレート
    const baselineEV = evForISO(5.6, 1/125, 100);
    const brightness = brightnessMultiplierFromEV(currentEV, baselineEV);
    
    // F値によるボケ (f/2.8で4px, f/16で0px程度の簡易計算)
    const blur = Math.max(0, (11 - fNum) * 0.8);
    
    // ISOによるノイズ強度 (0.0 ~ 1.0)
    const noiseOpacity = Math.max(0, Math.pow(Math.log2(isoNum / 100) / 6, 2) * 0.4);

    return {
      filter: `brightness(${brightness}) blur(${blur}px)`,
      noiseOpacity
    };
  }, [tryingPhoto, currentSS, currentF, currentISO]);

  // --- [変更]: 試すモード (フルスクリーン表示) ---
  if (tryingPhoto) {
    return (
      <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
        {/* メイン画像とエフェクト */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <img 
            src={tryingPhoto.imageUrl} 
            alt="Trying photo" 
            className="w-full h-full object-cover transition-all duration-200"
            style={{ filter: visualEffects.filter }}
          />
          
          {/* ノイズオーバーレイ (ISOシミュレーション) */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-screen bg-repeat opacity-0"
            style={{ 
              opacity: visualEffects.noiseOpacity,
              backgroundImage: `url('https://www.transparenttextures.com/patterns/stardust.png')`, // 簡易的なノイズテクスチャ
              backgroundSize: '200px 200px'
            }}
          />
        </div>

        {/* 戻るボタン */}
        <button 
          onClick={() => setTryingPhoto(null)}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full border border-white/10 transition-all active:scale-95 z-50"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span className="text-sm font-medium">一覧に戻る</span>
        </button>
      </div>
    );
  }

  // --- 一覧ビュー (Grid) ---
  return (
    <div className="flex flex-col w-full h-full bg-black relative">
      <div className="p-4 pt-6 border-b border-gray-900 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Gallery</h2>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1">SIMULATION STORAGE</p>
        </div>
        <span className="text-[10px] font-mono text-gray-600 bg-gray-900 px-2 py-1 rounded">30 SLOTS</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {galleryData.map((photo, index) => (
            <div 
              key={photo?.id || `empty-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-gray-800/50"
              onClick={() => photo && setSelectedPhotoForPopup(photo)}
            >
              {photo ? (
                <>
                  <img 
                    src={photo.imageUrl} 
                    alt={`Photo ${photo.id}`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[9px] text-white font-mono leading-none">
                      {photo.settings.ss} · {photo.settings.f}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-900/30 flex items-center justify-center border border-dashed border-gray-800">
                  <span className="material-symbols-outlined text-gray-800 text-xl select-none">
                    add_a_photo
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* [変更]: ポップアップ (モーダル) 実装 */}
      {selectedPhotoForPopup && (
        <div 
          className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoForPopup(null)}
        >
          <div 
            className="bg-gray-900 w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* サムネイル */}
            <div className="w-full aspect-video overflow-hidden">
              <img 
                src={selectedPhotoForPopup.imageUrl} 
                alt="Selected" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* コンテンツ */}
            <div className="p-6 text-center">
              <h3 className="text-white font-bold text-lg mb-2">この写真で設定を試す</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                現在のダイヤル設定をこの写真に反映して、露出やボケの変化を学習できます。
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedPhotoForPopup(null)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl transition-colors active:scale-95"
                >
                  キャンセル
                </button>
                <button 
                  onClick={() => {
                    setTryingPhoto(selectedPhotoForPopup);
                    setSelectedPhotoForPopup(null);
                  }}
                  className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold rounded-xl shadow-lg shadow-amber-400/20 transition-colors active:scale-95"
                >
                  試す
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
