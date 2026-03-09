import React, { useState, useMemo } from 'react';

// --- 型定義 ---
type ExposureSettings = {
  ss: string;  // シャッタースピード
  f: string;   // F値
  iso: string; // ISO感度
};

type PhotoData = {
  id: string;
  imageUrl: string;
  settings: ExposureSettings;
} | null;

// --- モックデータの生成 ---
const GENERATE_MOCK_DATA = (): PhotoData[] => {
  const dummyPhotos: PhotoData[] = [
    {
      id: '1',
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80',
      settings: { ss: '1/1000', f: 'f/2.8', iso: '100' },
    },
    {
      id: '2',
      imageUrl: 'https://images.unsplash.com/photo-1493246507139-91e8bef99c02?w=400&q=80',
      settings: { ss: '1/60', f: 'f/8.0', iso: '400' },
    },
    {
      id: '3',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80',
      settings: { ss: '30"', f: 'f/11', iso: '100' },
    },
    {
      id: '4',
      imageUrl: 'https://images.unsplash.com/photo-1500622388414-8055b16410e4?w=400&q=80',
      settings: { ss: '1/250', f: 'f/1.8', iso: '800' },
    },
    {
      id: '5',
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
      settings: { ss: '1/4000', f: 'f/4.0', iso: '200' },
    },
  ];

  // 合計30枠になるように残りをnullで埋める
  const totalSlots = 30;
  const remainingSlots = totalSlots - dummyPhotos.length;
  const emptySlots = Array(remainingSlots).fill(null);

  return [...dummyPhotos, ...emptySlots];
};

export const GalleryScreen: React.FC = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const galleryData = useMemo(() => GENERATE_MOCK_DATA(), []);

  // --- 詳細ビュー ---
  if (selectedPhoto) {
    return (
      <div className="flex flex-col h-full bg-black text-white overflow-y-auto pb-8">
        {/* ヘッダーエリア */}
        <div className="flex items-center p-4 border-b border-gray-800">
          <button 
            onClick={() => setSelectedPhoto(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>戻る</span>
          </button>
        </div>

        {/* メイン画像 */}
        <div className="w-full aspect-[4/3] bg-gray-900 flex items-center justify-center overflow-hidden">
          <img 
            src={selectedPhoto.imageUrl} 
            alt="Selected capture" 
            className="w-full h-full object-cover shadow-2xl"
          />
        </div>

        {/* 設定情報カード */}
        <div className="px-6 py-8 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-3 bg-gray-900 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Shutter</span>
              <span className="text-xl font-mono font-bold text-amber-500">{selectedPhoto.settings.ss}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-900 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Aperture</span>
              <span className="text-xl font-mono font-bold text-amber-500">{selectedPhoto.settings.f}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-900 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">ISO</span>
              <span className="text-xl font-mono font-bold text-amber-500">{selectedPhoto.settings.iso}</span>
            </div>
          </div>

          <div className="text-gray-400 text-sm leading-relaxed px-2">
            この写真は、夕暮れ時の自然光を活かして撮影されました。
            露出三角形のバランスを再現することで、同様の質感を体験できます。
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mt-auto px-6 flex flex-col gap-3">
          <button 
            onClick={() => alert(`設定を反映しました:\nSS: ${selectedPhoto.settings.ss}\nF: ${selectedPhoto.settings.f}\nISO: ${selectedPhoto.settings.iso}`)}
            className="w-full py-4 bg-amber-400 text-black font-bold rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-amber-400/20"
          >
            <span className="material-symbols-outlined">settings_backup_restore</span>
            この設定を試す
          </button>
          
          <button 
            onClick={() => setSelectedPhoto(null)}
            className="w-full py-4 bg-gray-800 text-white font-medium rounded-full active:scale-95 transition-transform"
          >
            一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  // --- 一覧ビュー (Grid) ---
  return (
    <div className="flex flex-col h-full bg-black">
      <div className="p-4 border-b border-gray-900 flex justify-between items-end">
        <h2 className="text-xl font-bold text-white tracking-tight">Gallery</h2>
        <span className="text-xs text-gray-500">30 items</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {galleryData.map((photo, index) => (
            <div 
              key={photo?.id || `empty-${index}`}
              className="relative aspect-square rounded-sm overflow-hidden group cursor-pointer"
              onClick={() => photo && setSelectedPhoto(photo)}
            >
              {photo ? (
                <>
                  <img 
                    src={photo.imageUrl} 
                    alt={`Photo ${photo.id}`} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {/* ホバー時のオーバーレイ */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                    <span className="text-[8px] text-white font-mono bg-black/50 px-1 rounded">
                      {photo.settings.ss}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-900/50 flex items-center justify-center border border-gray-800/30">
                  <span className="material-symbols-outlined text-gray-700 text-2xl select-none">
                    photo_library
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
