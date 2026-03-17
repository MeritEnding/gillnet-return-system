import React from 'react';
import './ScreenSaver.css';
import MascotImage from '../assets/mascot-sleep.png'; // ★ 이미지 경로 확인 필요

const ScreenSaver = ({ onWakeUp }) => {
  return (
    <div className="screensaver-container" onClick={onWakeUp}>
      <div className="screensaver-content">
        <div className="breathing-logo">
          <img src={MascotImage} alt="Mascot" />
        </div>
        <h1 className="screensaver-title">어구보증금제 무인 반납기</h1>
        <p className="screensaver-desc">화면을 터치하면 시작합니다</p>
        <div className="touch-guide-box">👆</div>
      </div>
    </div>
  );
};

export default ScreenSaver;