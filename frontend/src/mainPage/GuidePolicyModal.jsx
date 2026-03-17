import React from 'react';
import { useTranslation } from 'react-i18next';
import './GuidePolicyModal.css';
import MascotImage from '../assets/mascot.png'; 

const GuidePolicyModal = ({ onClose }) => {
  const { t } = useTranslation();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content-policy">
        {/* 헤더 */}
        <header className="modal-header-custom">
          <div className="close-btn-wrapper" onClick={onClose}>
            <span className="close-text">{t('btn_close', '닫기')}</span>
            <div className="close-icon-circle">×</div>
          </div>
        </header>
        
        <hr className="blue-divider" />
        
        <div className="modal-body-custom">
          {/* 타이틀 섹션 */}
          <div className="title-section">
            <div className="mascot-wrapper">
              <img src={MascotImage} alt="Mascot" className="policy-mascot" />
            </div>
            <h2 className="policy-main-title">{t('policy_title_1')}</h2>
          </div>

          <hr className="blue-divider-light" />

          {/* 본문 텍스트 */}
          <div className="policy-text-container">
            <p className="policy-desc">
              <span className="blue-highlight">{t('policy_text1_strong')}</span>
              {t('policy_text1')}
            </p>
            <p className="policy-desc highlight-para">
              <span className="blue-highlight">{t('policy_text2_strong')}</span>
              {t('policy_text2')}
            </p>
            <p className="policy-desc">
              {t('policy_text3')}
            </p>
          </div>

          {/* 확인 버튼 */}
          <button className="confirm-btn-large" onClick={onClose}>
            {t('modal_confirm_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidePolicyModal;