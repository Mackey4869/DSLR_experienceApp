import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import CameraView from './components/CameraView'

const Home: React.FC = () => (
  <div className="max-w-prose text-gray-200 p-4">
    <h1 className="text-2xl font-semibold mb-4">ホーム</h1>
    <p>カメラプレビューは「カメラ」へ移動してください。</p>
    <Link to="/camera" className="inline-block mt-4 px-4 py-2 rounded">カメラを開く</Link>
  </div>
)

const App: React.FC = () => {
  return (
    <div className="min-h-[100svh] text-white bg-gradient-to-b from-gray-900 to-gray-800">
      {/* シンプルなルーティングのみ。UI は各画面コンポーネントに任せる */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/camera" element={<CameraView />} />
      </Routes>
    </div>
  )
}

export default App
