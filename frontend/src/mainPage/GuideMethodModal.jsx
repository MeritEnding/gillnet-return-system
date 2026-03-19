import React from 'react';
import { useTranslation } from 'react-i18next';
import './GuideMethodModal.css'; 

const GuideMethodModal = ({ onClose }) => {
  const { t } = useTranslation();
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content-method">
        <header className="modal-header-custom">
          <div className="close-btn-wrapper" onClick={onClose}>
            <span className="close-text">{t('btn_close', '닫기')}</span>
            <div className="close-icon-circle">×</div>
          </div>
        </header>
        <hr className="blue-divider" />
        
        <div className="modal-body-custom">
          <h2 className="modal-main-title">{t('method_title_main')}</h2>

          <div className="method-content-split">
            {/* 왼쪽: 핸드폰 이미지 */}
            <div className="left-image-section">
              <svg viewBox="0 0 24 40" className="phone-svg">
                <rect x="1" y="1" width="22" height="38" rx="3" fill="#fff" stroke="#333" strokeWidth="1.5"/>
                <rect x="3" y="4" width="18" height="26" fill="#fff" stroke="#ccc" strokeWidth="1"/>
                <rect x="6" y="8" width="12" height="12" fill="#333" opacity="0.9"/>
                <path d="M8 10h2v2H8zM14 10h2v2h-2zM8 16h2v2H8zM14 16h2v2h-2z" fill="#fff"/>
                <circle cx="12" cy="35" r="1.5" fill="#333" />
              </svg>
            </div>

            {/* 오른쪽: 단계 리스트 */}
            <div className="right-steps-section">
              {[1, 2, 3, 4].map((num) => (
                <div className="step-row" key={num}>
                  <div className="step-num">{num}</div>
                  <div className="step-text-group">
                    <h3 className="step-title">{t(`method_step${num}_title`)}</h3>
                    <p className="step-desc">{t(`method_step${num}_desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="confirm-btn-large" onClick={onClose}>
            {t('modal_confirm_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideMethodModal;