// src/mainPage/HeroSection.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import HeroMainImage from '../assets/hero-main.png';

const HeroSection = ({ isVideoPlaying, setIsVideoPlaying, currentVideoSrc }) => {
  const { t } = useTranslation();

  const closeVideo = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsVideoPlaying(false);
  };

  const openVideo = () => {
    setIsVideoPlaying(true);
  };

  return (
    <section className="hero-section">
      {!isVideoPlaying ? (
        <div className="hero-image-container" onClick={openVideo}>
          <img src={HeroMainImage} alt="Info" className="hero-main-img" />
        </div>
      ) : (
        <div className="hero-video-expanded" onClick={closeVideo}>
          <video
            src={currentVideoSrc}
            autoPlay
            className="full-video-element"
            onEnded={closeVideo}
          />
          <div className="video-close-hint">{t('video_close_hint')}</div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
