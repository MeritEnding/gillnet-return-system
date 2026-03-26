import React from 'react';
import { useTranslation } from 'react-i18next';
import './Footer.css'; 

import FlagKR from '../assets/kor-flag.png';
import FlagUS from '../assets/usa-flag.png';
import FlagVN from '../assets/vn-flag.png';
import FlagPH from '../assets/ph-flag.png';
import FlagID from '../assets/id-flag.png';
import FlagMM from '../assets/mm-flag.png';

const Footer = ({ onGuide }) => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'ko', label: '한국어', flag: FlagKR },
    { code: 'en', label: 'English', flag: FlagUS },
    { code: 'vi', label: 'Tiếng Việt', flag: FlagVN },
    { code: 'tl', label: 'Tagalog', flag: FlagPH },
    { code: 'id', label: 'Indonesia', flag: FlagID },
    { code: 'my', label: 'Myanmar', flag: FlagMM },
  ];

  return (
    <footer className="bottom-bar-footer">
      <div className="bottom-bar-inner">
      

        {/* 아랫줄: 언어 버튼들 */}
        <div className="bottom-bar-row">
          {languages.map((lang) => {
            const isActive = i18n.language.includes(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`row-lang-btn ${isActive ? 'active' : ''}`}
              >
                <img src={lang.flag} alt={lang.code} className="row-lang-flag" />
                <span className="row-lang-text">{lang.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default Footer;