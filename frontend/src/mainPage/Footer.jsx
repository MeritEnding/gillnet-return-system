// src/components/Footer.jsx (경로는 프로젝트에 맞게 수정하세요)
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Footer.css'; 
import PolicyModal from './PolicyModal'; // ★ 신규 모달 컴포넌트 임포트

import FlagKR from '../assets/kor-flag.png';
import FlagUS from '../assets/usa-flag.png';
import FlagVN from '../assets/vn-flag.png';
import FlagPH from '../assets/ph-flag.png';
import FlagID from '../assets/id-flag.png';
import FlagMM from '../assets/mm-flag.png';

const Footer = ({ onGuide }) => {
  const { t, i18n } = useTranslation();
  
  // ★ 모달 상태 관리
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '' });

  const languages = [
    { code: 'ko', label: '한국어', flag: FlagKR },
    { code: 'en', label: 'English', flag: FlagUS },
    { code: 'vi', label: 'Tiếng Việt', flag: FlagVN },
    { code: 'tl', label: 'Tagalog', flag: FlagPH },
    { code: 'id', label: 'Indonesia', flag: FlagID },
    { code: 'my', label: 'Myanmar', flag: FlagMM },
  ];

  const openModal = (type) => setModalConfig({ isOpen: true, type });
  const closeModal = () => setModalConfig({ isOpen: false, type: '' });

  return (
    <>
      <footer className="bottom-bar-footer">
        <div className="bottom-bar-inner">
          
          {/* ★ 추가: 이용약관 & 개인정보처리방침 링크 */}
          <div className="bottom-bar-links">
            <button onClick={() => openModal('terms')} className="policy-link-btn">
              {t('footer_terms') || '이용약관'}
            </button>
            <span className="policy-divider">|</span>
            <button onClick={() => openModal('privacy')} className="policy-link-btn bold">
              {t('footer_privacy') || '개인정보처리방침'}
            </button>
          </div>

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

      {/* ★ 추가: 모달 컴포넌트 렌더링 */}
      {modalConfig.isOpen && (
        <PolicyModal type={modalConfig.type} onClose={closeModal} />
      )}
    </>
  );
};

export default Footer;