import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './Header.css';

import HeaderBg from '../assets/header_bg.png';
import FlagKR from '../assets/kor-flag.png';
import FlagUS from '../assets/usa-flag.png';
import FlagVN from '../assets/vn-flag.png';
import FlagPH from '../assets/ph-flag.png';
import FlagID from '../assets/id-flag.png';
import FlagMM from '../assets/mm-flag.png';

// 전원(처음으로) 아이콘
const PowerIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// 모달용 경고 아이콘
const WarningIcon = () => (
  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ★ [추가됨] 범용 언어 선택 아이콘 (지구본)
const GlobeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#6CC24A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#6CC24A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12h20" stroke="#6CC24A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // ★ 드롭다운 대신 모달 상태로 변경
  const [showLangModal, setShowLangModal] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);

  const languages = [
    { code: 'ko', label: '한국어', flag: FlagKR },
    { code: 'en', label: 'English', flag: FlagUS },
    { code: 'vi', label: 'Tiếng Việt', flag: FlagVN },
    { code: 'tl', label: 'Tagalog', flag: FlagPH },
    { code: 'id', label: 'Indonesia', flag: FlagID },
    { code: 'my', label: 'Myanmar', flag: FlagMM },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentLocale = i18n.language;
  const dateYear = currentTime.getFullYear();
  const dateMonth = String(currentTime.getMonth() + 1).padStart(2, '0');
  const dateDay = String(currentTime.getDate()).padStart(2, '0');
  const dayOfWeek = currentTime.toLocaleDateString(currentLocale, { weekday: 'short' });
  const timeString = currentTime.toLocaleTimeString(currentLocale, {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  const formattedDate = `${dateYear}.${dateMonth}.${dateDay} (${dayOfWeek}) / ${timeString}`;

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setShowLangModal(false); // 선택 후 모달 닫기
  };

  const handleHomeBtnClick = () => {
    setShowHomeModal(true);
  };

  const confirmGoHome = () => {
    window.speechSynthesis.cancel();
    localStorage.removeItem('session_token');
    localStorage.removeItem('fisherman_name');
    localStorage.removeItem('fisherman_id');
    sessionStorage.clear();
    setShowHomeModal(false);
    navigate('/');
  };

  const cancelGoHome = () => {
    setShowHomeModal(false);
  };

  return (
    <>
      <header 
        className="common-header" 
        data-lang={i18n.language} 
        style={{ backgroundImage: `url(${HeaderBg})` }}
      >
        <div className="header-info-box">
          <div className="date-time">{formattedDate}</div>
          <div className="location-name">
            {(t('location_name') || '').split('/').map((line, idx) => (
               <React.Fragment key={idx}>
                 {line.trim()}
                 {idx === 0 && <br/>}
               </React.Fragment>
            ))}
          </div>
        </div>

        <div className="header-right-group">
          <button className="header-btn header-home-btn" onClick={handleHomeBtnClick}>
            <div className="header-btn-icon">
               <PowerIcon />
            </div>
            <span className="header-btn-text">
              {t('btn_home') || "처음으로"}
            </span>
          </button>

          <div className="lang-container">
            {/* ★ 특정 국기 대신 지구본 아이콘 렌더링 */}
            <button className="header-btn header-lang-btn" onClick={() => setShowLangModal(true)}>
              <div className="header-btn-icon">
                 <GlobeIcon />
              </div>
              <span className="header-btn-text">
                {t('header_lang_select') || "언어선택"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ★ [추가됨] 대형 언어 선택 모달 */}
      {showLangModal && (
        <div className="header-modal-overlay" onClick={() => setShowLangModal(false)}>
          <div className="lang-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="lang-modal-title">
              {t('header_lang_select') || "언어 선택 (Language)"}
            </h3>
            <div className="lang-modal-grid">
              {languages.map((lang) => (
                <button 
                  key={lang.code} 
                  onClick={() => changeLanguage(lang.code)} 
                  // 현재 선택된 언어일 경우 강조 표시
                  className={`lang-grid-btn ${i18n.language.includes(lang.code) ? 'active' : ''}`}
                >
                  <img src={lang.flag} alt={lang.code} className="lang-grid-flag" />
                  <span className="lang-grid-text">{lang.label}</span>
                </button>
              ))}
            </div>
            <button className="lang-modal-close-btn" onClick={() => setShowLangModal(false)}>
              {t('btn_cancel') || "닫기 (Close)"}
            </button>
          </div>
        </div>
      )}

      {/* 홈 이동 확인 모달 (기존과 동일) */}
      {showHomeModal && (
        <div className="header-modal-overlay">
          <div className="header-modal-box">
            <div className="header-modal-icon">
              <WarningIcon />
            </div>
            <h3 className="header-modal-title">
              {t('modal_home_title') || "처음으로 이동"}
            </h3>
            <p className="header-modal-message">
              {(t('modal_home_msg') || "진행 중인 내용은 저장되지 않습니다.\n처음 화면으로 돌아가시겠습니까?").split('\n').map((line, i) => (
                <React.Fragment key={i}>{line}<br/></React.Fragment>
              ))}
            </p>
            <div className="header-modal-actions">
              <button className="header-modal-btn confirm" onClick={confirmGoHome}>
                {t('btn_yes') || "예"}
              </button>
              <button className="header-modal-btn cancel" onClick={cancelGoHome}>
                {t('btn_no') || "아니요"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;