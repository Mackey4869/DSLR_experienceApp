import React from 'react';

const InfoScreen: React.FC = () => {
  return (
    <div className="w-full h-full bg-neutral-900 text-gray-100 overflow-y-auto p-6 font-sans">
      <div className="max-w-md mx-auto">
        {/* Title Section */}
        <div className="border-b border-red-600/50 pb-4 mb-6">
          <h1 className="text-2xl font-black tracking-tighter text-white italic">
            DSLR <span className="text-red-600">Experience Sim</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-1 font-bold">
            Optical Physics Simulator v1.0
          </p>
        </div>

        {/* Description */}
        <div className="mb-8">
          <p className="text-sm leading-relaxed text-gray-300 bg-neutral-800/50 p-4 rounded-lg border border-white/5">
            一眼レフカメラの露出設定（F値、SS、ISO）が写真に与える影響をリアルタイムに体験できるシミュレーターです。
          </p>
        </div>

        {/* Settings Guide */}
        <div className="space-y-6">
          <section className="group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 bg-red-600 rounded-full" />
              <h2 className="text-lg font-bold tracking-tight text-white group-hover:text-red-500 transition-colors">
                F値 (Aperture)
              </h2>
            </div>
            <p className="text-sm text-gray-400 pl-4 border-l border-neutral-800 ml-0.5 leading-relaxed">
              値を小さくすると背景がボケます。大きくすると全体にピントが合い、F8以上で強い光源に光条が発生します。
            </p>
          </section>

          <section className="group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 bg-red-600 rounded-full" />
              <h2 className="text-lg font-bold tracking-tight text-white group-hover:text-red-500 transition-colors">
                SS (Shutter Speed)
              </h2>
            </div>
            <p className="text-sm text-gray-400 pl-4 border-l border-neutral-800 ml-0.5 leading-relaxed">
              遅いと画面が明るくなり、動く被写体がブレる長秒露光の残像が発生します。
            </p>
          </section>

          <section className="group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 bg-red-600 rounded-full" />
              <h2 className="text-lg font-bold tracking-tight text-white group-hover:text-red-500 transition-colors">
                ISO感度
              </h2>
            </div>
            <p className="text-sm text-gray-400 pl-4 border-l border-neutral-800 ml-0.5 leading-relaxed">
              高感度にすると暗い場所でも明るくなりますが、デジタル特有のノイズが発生します。
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-neutral-800 text-[10px] font-mono text-gray-500 tracking-widest">
            DIGITAL BACK SYSTEM v1.0.4
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoScreen;
