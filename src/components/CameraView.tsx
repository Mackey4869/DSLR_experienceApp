import React from "react";

// メインの映像表示（Canvasなど）
// - Mobile-first レイアウト
// - Safe area: env(safe-area-inset-top/bottom) をパディングに使用
// - プレビューはアスペクト比 2:3、幅いっぱい表示
// - アイコンは Lucide React 等を使う想定でコメントで配置

const CameraView: React.FC = () => {
	return (
		<div className="h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] flex flex-col justify-between items-center text-white box-border">
			{/* カメラプレビュー領域（アスペクト比 2:3） */}
			<div className="w-full max-w-[60vw] mx-auto aspect-[2/3] bg-gray-900 flex-shrink-0 flex items-center justify-center overflow-hidden">
				{/* プレースホルダー（実装時は video/canvas をここに入れる） */}
				<div className="w-11/12 h-11/12 max-w-[320px] bg-gray-800 rounded-md overflow-hidden">
					{/* 実装時はここに <video> または <canvas> を入れてください。
					   例: <video className="w-full h-full object-cover" autoPlay muted playsInline /> */}
					<div className="w-full h-full flex items-center justify-center">
						<div className="text-gray-300/90 text-sm">カメラプレビュー</div>
					</div>
				</div>
			</div>

			{/* 下部 UI エリア */}
			<div className="w-full px-6 py-4 flex flex-col items-center gap-4">
				{/* 露出設定プレースホルダー */}
				<div className="w-full max-w-md flex justify-between text-white/90">
					<div className="flex flex-col items-center">
						<span className="text-xs text-gray-400">F</span>
						<span className="text-sm">2.8</span>
					</div>
					<div className="flex flex-col items-center">
						<span className="text-xs text-gray-400">SS</span>
						<span className="text-sm">1/125</span>
					</div>
					<div className="flex flex-col items-center">
						<span className="text-xs text-gray-400">ISO</span>
						<span className="text-sm">100</span>
					</div>
				</div>

				{/* シャッターボタン */}
				<div className="w-full flex justify-center">
					<button
						aria-label="シャッター"
						className="w-20 h-20 rounded-full bg-white/6 border-2 border-white/12 flex items-center justify-center"
					>
						<div className="w-12 h-12 rounded-full bg-white" />
					</button>
				</div>

				{/* 下部アイコン / 操作エリア（プレースホルダー） */}
				<div className="w-full max-w-md flex justify-between text-sm text-gray-400">
					<div className="flex items-center gap-2">
						{/* アイコン: <Flash /> */}
						<span>フラッシュ</span>
					</div>
					<div className="flex items-center gap-2">
						{/* アイコン: <Settings /> */}
						<span>設定</span>
					</div>
					<div className="flex items-center gap-2">
						{/* アイコン: <CameraOff /> or <SwitchCamera /> */}
						<span>カメラ切替</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CameraView;