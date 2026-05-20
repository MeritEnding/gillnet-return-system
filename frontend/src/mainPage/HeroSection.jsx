// src/mainPage/HeroSection.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import HeroMainImage from '../assets/hero-main.png';

const HeroSection = ({ isVideoPlaying, setIsVideoPlaying, currentVideoSrc, currentSubtitleSrc, currentLang }) => {
  const { t } = useTranslation();

  const closeVideo = (e) => {
    e.stopPropagation(); 
    setIsVideoPlaying(false);
  };

  const openVideo = () => {
    // ★ [핵심 추가] 영상을 클릭해서 열 때, 현재 나오고 있는 TTS 음성을 즉시 꺼버립니다!
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsVideoPlaying(true);
  };

  return (
    <section className="hero-section" data-lang={currentLang}>
      {!isVideoPlaying ? (
        <div className="hero-image-container" onClick={openVideo}>
          <img src={HeroMainImage} alt={t('hero_main_alt') || 'Info'} className="hero-main-img" />
        </div>
      ) : (
        <div className="hero-video-expanded" onClick={closeVideo}>
          <video
            src={currentVideoSrc}
            autoPlay
            className="full-video-element"
            onEnded={closeVideo}
          >
            {/* 자막 소스가 있을 때만 track 요소 렌더링 */}
            {currentSubtitleSrc && (
              <track
                kind="subtitles"
                src={currentSubtitleSrc}
                srcLang={currentLang}
                label="Subtitle"
                default 
              />
            )}
          </video>
        </div>
      )}
    </section>
  );
};

export default HeroSection;