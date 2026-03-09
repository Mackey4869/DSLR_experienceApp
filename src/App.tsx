import React from 'react'
import { Routes, Route } from 'react-router-dom'
import CameraView from './components/CameraView'
import PhoneFrame from './components/PhoneFrame'

const App: React.FC = () => {
  return (
    <PhoneFrame>
      {/* [修正]: PCフレーム内での高さはみ出し対応 */}
      <div className="h-full min-h-[100svh] min-[900px]:min-h-full text-white bg-gradient-to-b from-gray-900 to-gray-800">
        {/* ルートをカメラ画面に変更（Home は不要） */}
        <Routes>
          <Route path="/" element={<CameraView />} />
        </Routes>
      </div>
    </PhoneFrame>
  )
}

export default App
