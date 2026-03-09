import React, { useState } from 'react';
import { calculateBlurAmount, formatShutterSpeed, formatAperture } from '../utils/helpers';
import { uploadGalleryPost } from '../utils/galleryApi';

interface PhotoPreviewProps {
  image: string;
  onBack: () => void;
  settings: {
    shutterSpeed: number;
    aperture: number;
    iso: number;
  };
}

const PhotoPreview: React.FC<PhotoPreviewProps> = ({ image, onBack, settings }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentSS = formatShutterSpeed(settings.shutterSpeed);
  const currentF = formatAperture(settings.aperture);
  const currentISO = `${settings.iso}`;

  const handlePost = () => {
    setShowConfirm(true);
  };

  const confirmPost = async () => {
    setIsUploading(true);
    try {
      await uploadGalleryPost(image, {
        ss: currentSS,
        f: currentF,
        iso: currentISO,
      });
      alert('ギャラリーに投稿しました！');
      setShowConfirm(false);
      onBack();
    } catch (error) {
      console.error('Upload error:', error);
      alert('投稿に失敗しました。通信環境を確認してください。');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] bg-black flex flex-col transition-opacity duration-300">
      <div className="relative flex-1 overflow-hidden">
        <img
          src={image}
          alt="Captured"
          className="w-full h-full object-cover"
          style={{
            filter: `blur(${calculateBlurAmount(settings.aperture)}px)`,
          }}
        />

        {/* 露出情報オーバーレイ */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-4 font-mono text-[10px] font-bold text-white/90 tracking-wider">
            <span>SS {currentSS}</span>
            <span>{currentF}</span>
            <span>ISO {currentISO}</span>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="p-4 flex gap-3 bg-neutral-900 border-t border-white/10">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg bg-neutral-800 text-white text-xs font-bold tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2 border border-white/5"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          カメラに戻る
        </button>
        <button
          onClick={handlePost}
          className="flex-1 py-3 rounded-lg bg-red-600 text-white text-xs font-bold tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
        >
          <span className="material-symbols-outlined text-sm">send</span>
          投稿する
        </button>
      </div>

      {/* 確認ポップアップ */}
      {showConfirm && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm transition-all duration-200">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-[280px]">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-yellow-500 text-2xl">warning</span>
              </div>
              <h3 className="text-white font-bold text-sm mb-2">投稿の確認</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                個人情報などが写っていないか確認してください。
              </p>
              <div className="flex flex-col w-full gap-2">
                <button
                  onClick={confirmPost}
                  className="w-full py-2.5 bg-white text-black text-xs font-bold rounded-lg active:scale-95 transition-transform"
                >
                  はい、投稿する
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-2.5 bg-neutral-800 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoPreview;
