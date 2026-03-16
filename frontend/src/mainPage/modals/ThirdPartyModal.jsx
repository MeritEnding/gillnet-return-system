import React from 'react';
import { useTranslation } from 'react-i18next';
// 스타일은 Home.css (또는 통합된 CSS)에 정의된 .third-party-modal-xl 등을 사용합니다.

const ThirdPartyModal = ({ onClose, onAgree }) => {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* 21인치 전용 클래스: third-party-modal-xl */}
      <div className="modal-content third-party-modal-xl" onClick={(e) => e.stopPropagation()}>
        
        {/* 타이틀 확대 클래스 */}
        <h2 className="privacy-header-title-xl">{t('privacy_third_party_title')}</h2>
        
        {/* 내부 박스 확대 클래스 */}
        <div className="privacy-inner-box-xl">
          <div className="third-party-content-xl">
            <p className="tp-main-text">
              <strong>{t('privacy_third_party_main')}</strong><br />
              {t('privacy_third_party_sub')}
            </p>
            
            <div className="third-party-list-xl">
              <p>{t('privacy_tp_recipient')}</p>
              <p>{t('privacy_tp_item')}</p>
              <p>{t('privacy_tp_purpose')}</p>
            </div>
            
            <p className="tp-question-text">
              <strong>{t('privacy_tp_ask')}</strong>
            </p>
          </div>
        </div>

        {/* 버튼 그룹 확대 클래스 */}
        <div className="privacy-btn-group-xl">
          <button className="privacy-action-btn-xl btn-agree-blue" onClick={onAgree}>
            {t('btn_agree')}
          </button>
          <button className="privacy-action-btn-xl btn-cancel-green" onClick={onClose}>
            {t('btn_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThirdPartyModal;