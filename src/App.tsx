import React from 'react'
import { Routes, Route } from 'react-router-dom'
import CameraView from './components/CameraView'
import PhoneFrame from './components/PhoneFrame'

const App: React.FC = () => {
  return (
    <PhoneFrame>
      <div className="min-h-[100svh] text-white bg-gradient-to-b from-gray-900 to-gray-800">
        {/* ルートをカメラ画面に変更（Home は不要） */}
        <Routes>
          <Route path="/" element={<CameraView />} />
        </Routes>
      </div>
    </PhoneFrame>
  )
}

export default App
