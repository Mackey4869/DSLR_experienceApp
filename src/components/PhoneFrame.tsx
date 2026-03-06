import React from 'react'

type Props = {
  children: React.ReactNode
}

const PhoneFrame: React.FC<Props> = ({ children }) => {
  return (
    <div className="phone-wrapper">
      <div className="phone-container">
        <div className="phone-bezel" aria-hidden>
          <div className="phone-notch" />
          <div className="phone-screen">{children}</div>
          <div className="phone-home" />
        </div>
      </div>
    </div>
  )
}

export default PhoneFrame
