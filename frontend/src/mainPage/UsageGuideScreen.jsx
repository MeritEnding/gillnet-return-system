// src/components/UsageGuideScreen.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import './UsageGuideScreen.css';
import GuideMethodModal from './GuideMethodModal';
import GuidePolicyModal from './GuidePolicyModal';
import GuideFaqModal from './GuideFaqModal';

const UsageGuideScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  // 관리자 페이지로 이동하는 함수
  const handleAdminClick = () => {
    // '/admin' 경로는 실제 라우터 설정에 맞게 수정해주세요.
    navigate('/admin');
  };

  return (
    <div className="guide-container">
      {/* 1. 상단 헤더: 좌측 뒤로가기 / 우측 타이틀 */}
      <header className="guide-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <div className="back-icon-circle">◀</div> 
          <span>{t('guide_back_button')}</span>
        </button>
        <h1 className="guide-title">{t('guide_title')}</h1>
      </header>

      {/* 2. 주요 안내 버튼 그룹 */}
      <div className="guide-button-group">
        <button 
          className="guide-menu-button" 
          onClick={() => setIsMethodOpen(true)} 
        >
          <div className="button-icon">❓</div>
          <span className="button-text">{t('guide_method_button')}</span>
        </button>

        <button 
          className="guide-menu-button" 
          onClick={() => setIsPolicyOpen(true)} 
        >
          <div className="button-icon">⚖️</div>
          <span className="button-text">{t('guide_policy_button')}</span>
        </button>

        <button 
          className="guide-menu-button" 
          onClick={() => setIsFaqOpen(true)} 
        >
          <div className="button-icon">💬</div>
          <span className="button-text">{t('guide_faq_button')}</span>
        </button>

        {/* [추가됨] 관리자 페이지 이동 버튼 */}
        <button 
          className="guide-menu-button" 
          onClick={handleAdminClick} 
        >
          <div className="button-icon">⚙️</div>
          {/* 번역 파일에 키가 없다면 기본 텍스트가 보이도록 처리 */}
          <span className="button-text">{t('guide_admin_button') || '관리자'}</span>
        </button>
      </div>

      {/* 3. 하단 안내 박스 */}
      <div className="caution-box">
        <h2 className="caution-title">{t('guide_caution_title')}</h2>
        <p className="caution-text">
          {/* JSON 데이터에 줄바꿈(\n)이 있으면 적용 */}
          {t('guide_caution_text').split('\n').map((line, i) => (
             <React.Fragment key={i}>
               {line}
               {i < t('guide_caution_text').split('\n').length - 1 && <br />}
             </React.Fragment>
          ))}
        </p>
      </div>

      {/* 모달 렌더링 */}
      {isMethodOpen && <GuideMethodModal onClose={() => setIsMethodOpen(false)} />}
      {isPolicyOpen && <GuidePolicyModal onClose={() => setIsPolicyOpen(false)} />}
      {isFaqOpen && <GuideFaqModal onClose={() => setIsFaqOpen(false)} />}
    </div>
  );
};

export default UsageGuideScreen;