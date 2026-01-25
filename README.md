# 擬似一眼体験アプリ

カメラの露出計算やプレビューを行うための、React製Webアプリケーションです。

## 🚀 技術スタック

- **Frontend:** React (TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4 (Alpha/Experimental)
- **Package Manager:** pnpm

## 🛠 セットアップ

### 1. クローン
```bash
git clone https://github.com/Mackey4869/DSLR_experienceApp.git
cd frontend
```
### 2. 依存関係のインストール
```bash
pnpm install
```
### 3. 開発サーバーの起動
```bash
pnpm dev
```

## 📂 ディレクトリ構造
- **src/components/**: UIコンポーネント
  - `Dial/`: 露出設定（F値など）を選択するダイヤルUI
  - `Overlay/`: カメラ画面上に重なる情報表示（グリッドや設定値）
  - `CameraView.tsx`: カメラ映像を表示するメインコンポーネント
- **src/hooks/**: カスタムフック（ロジック）
  - `useCamera.ts`: ブラウザのカメラデバイス起動・停止・制御
  - `useExposure.ts`: 露出（F値・SS・ISO）の状態管理と計算ロジック
- **src/utils/**: ユーティリティ
  - `constants.ts`: F値の刻み、ISOリスト、シャッタースピード等の定数定義
  - `exposureCalc.ts`: 露出値（EV）や各パラメーターの計算式

## ✨ 主な機能（実装予定）

 - [ ] ブラウザからのカメラアクセスとリアルタイムプレビュー
 - [ ] F値 / シャッタースピード / ISO 感度の手動シミュレーション
 - [ ] 露出計のような最適な設定値の計算・表示

## 🛠️ 開発メモ

- **Tailwind CSS v4**: 最新の CSS-first な手法を採用。設定ファイルなしで動作させています。
- **pnpm v10**: 高速なパッケージ管理。
- **TypeScript**: 厳密な型定義により、露出計算などのロジックの安全性を確保。
