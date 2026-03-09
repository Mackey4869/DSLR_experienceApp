import React from 'react';

interface ExposureInfoScreenProps {
  onBack: () => void;
}

/**
 * 露出の三角形（Exposure Triangle）の解説画面
 * InfoScreenやGalleryScreenと同様、ディスプレイ全域を使用し、
 * 縦スクロール可能な形式で詳細な解説を提供します。
 */
const ExposureInfoScreen: React.FC<ExposureInfoScreenProps> = ({ onBack }) => {
  return (
    <div className="w-full h-full bg-neutral-950 text-gray-100 overflow-y-auto p-6 font-sans relative">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <div className="flex justify-start mb-6">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full border border-white/10 transition-all active:scale-95 shadow-lg"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Back to Camera</span>
          </button>
        </div>

        {/* Title Section */}
        <div className="border-b border-red-600 pb-4 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-red-600 rounded-full" />
            <h1 className="text-2xl font-black tracking-tighter text-white italic uppercase">
              Exposure <span className="text-red-600">Triangle</span>
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-1 font-bold">
            露出の3大要素とバランス
          </p>
        </div>

        {/* Content Section */}
        <div className="space-y-10 pb-16">
          {/* Introduction */}
          <section>
            <p className="text-sm leading-relaxed text-gray-300 bg-neutral-900/80 p-5 rounded-2xl border border-white/5 shadow-inner">
              露出の三角形は、写真の明るさを決める3つの設定値<span className="text-white font-bold mx-1">（F値、シャッタースピード、ISO感度）</span>の関係性を表した概念です。
              これらをバランスよく調整することで、思い通りの明るさと表現を手に入れることができます。
            </p>
          </section>

          {/* Meaning of the Area */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-l-2 border-red-600 pl-3">
              三角形の「面積」が表すもの
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed px-1">
              このアプリで表示される中央の白い三角形は、センサーが受け取る<span className="text-white font-bold">「光の総量」</span>を視覚化しています。
            </p>
            
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="bg-neutral-900 p-5 rounded-2xl border border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <div className="text-xs text-white font-black uppercase tracking-tighter">Large Area (面積大)</div>
                </div>
                <div className="text-sm text-gray-300 font-bold leading-tight mb-2">三角形が大きいほど、写真は明るくなります。</div>
                <div className="text-[11px] text-gray-500 leading-relaxed italic">
                  取り込む光が多い状態です。明るすぎる場合は、いずれかの設定値を下げて調整します。
                </div>
              </div>

              <div className="bg-neutral-900 p-5 rounded-2xl border border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                  <div className="text-xs text-white font-black uppercase tracking-tighter">Small Area (面積小)</div>
                </div>
                <div className="text-sm text-gray-300 font-bold leading-tight mb-2">三角形が小さいほど、写真は暗くなります。</div>
                <div className="text-[11px] text-gray-500 leading-relaxed italic">
                  取り込む光が不足している状態です。暗すぎる場合は、設定値を上げて光を補います。
                </div>
              </div>
            </div>
          </section>

          {/* Three Elements */}
          <section className="space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-l-2 border-red-600 pl-3">
              3つの要素とトレードオフ
            </h2>
            
            <div className="space-y-4">
              <div className="p-5 bg-neutral-900/50 rounded-2xl border border-white/5">
                <h3 className="text-xs font-black text-red-500 uppercase mb-2 tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">camera</span> F値 (Aperture)
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  レンズの絞り具合。値を小さく（開放）すると光が多く入り、背景が大きくボケます。大きくすると全体にピントが合いますが、光は少なくなります。
                </p>
              </div>

              <div className="p-5 bg-neutral-900/50 rounded-2xl border border-white/5">
                <h3 className="text-xs font-black text-red-500 uppercase mb-2 tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">shutter_speed</span> SS (Shutter Speed)
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  シャッターが開いている時間。遅くすると光を長時間取り込めますが、動くものがブレます。速くすると一瞬を切り取れますが、光は少なくなります。
                </p>
              </div>

              <div className="p-5 bg-neutral-900/50 rounded-2xl border border-white/5">
                <h3 className="text-xs font-black text-red-500 uppercase mb-2 tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">settings_input_component</span> ISO感度
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  センサーの感度。上げると電気的に明るくできますが、デジタルノイズが発生して画質が低下します。基本は100などの低い値に保ちます。
                </p>
              </div>
            </div>
          </section>

          {/* Balancing Tip */}
          <section className="bg-gradient-to-br from-red-600/10 to-transparent p-6 rounded-3xl border border-red-600/20">
            <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-widest">
              撮影のヒント
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              「表現のために何かを変えたら、別の何かでバランスをとる」のが露出の基本です。
              ボケを活かすためにF値を小さくしたら、その分明るくなりすぎるのでSSを速くする。
              このように三角形の面積を一定に保つ意識が、上達への近道です。
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-white/5 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-neutral-900 text-[10px] font-mono text-gray-500 tracking-[0.2em]">
            EXPOSURE ANALYZER v1.0.1
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExposureInfoScreen;
