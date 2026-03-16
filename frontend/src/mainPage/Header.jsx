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

const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);

  const languages = [
    { code: 'ko', label: '한국어', flag: FlagKR },
    { code: 'en', label: 'English', flag: FlagUS },
    { code: 'vi', label: 'Tiếng Việt', flag: FlagVN },
    { code: 'tl', label: 'Tagalog', flag: FlagPH },
    { code: 'id', label: 'Indonesia', flag: FlagID },
    { code: 'my', label: 'Myanmar', flag: FlagMM },
  ];

  const currentLangObj = languages.find(l => i18n.language.includes(l.code)) || languages[0];

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
    setShowLangMenu(false);
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

          <div className="lang-container" style={{ position: 'relative' }}>
            <button className="header-btn header-lang-btn" onClick={() => setShowLangMenu(!showLangMenu)}>
              <div className="header-btn-icon">
                 <img src={currentLangObj.flag} alt="current language" />
              </div>
              <span className="header-btn-text">
                {t('header_lang_select') || "언어선택"}
              </span>
            </button>

            {showLangMenu && (
              <div className="lang-dropdown">
                {languages.map((lang) => (
                  <button key={lang.code} onClick={() => changeLanguage(lang.code)} className="lang-option-btn">
                    <img src={lang.flag} alt={lang.code} className="lang-option-flag" />
                    <span className="lang-option-text">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 홈 이동 확인 모달 */}
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
              {/* ★ [수정] 예(Confirm)를 왼쪽, 아니요(Cancel)를 오른쪽으로 배치 */}
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