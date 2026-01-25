import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import CameraView from './components/CameraView'

const Home: React.FC = () => (
  <div className="max-w-prose text-gray-200 p-4">
    <h1 className="text-2xl font-semibold mb-4">ホーム</h1>
    <p>カメラプレビューは「カメラ」へ移動してください。</p>
    <Link to="/camera" className="inline-block mt-4 px-4 py-2 bg-white/6 rounded">カメラを開く</Link>
  </div>
)

const App: React.FC = () => {
  return (
    <div className="min-h-[svh] bg-black text-white">
      <header className="p-4 flex gap-4">
        <Link to="/" className="text-sm text-gray-300">ホーム</Link>
        <Link to="/camera" className="text-sm text-gray-300">カメラ</Link>
      </header>

      <main className="p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/camera" element={<CameraView />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
