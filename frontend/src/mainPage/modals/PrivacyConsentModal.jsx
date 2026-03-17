import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
// 스타일은 Home.css (또는 통합된 CSS)에 정의된 .privacy-consent-modal-xl 등을 사용합니다.

const PrivacyConsentModal = ({ onClose, onConfirm }) => {
  const { t } = useTranslation();

  // 체크박스 상태 관리
  const [agreements, setAgreements] = useState({
    term1: false, // 개인정보 수집 이용 동의 (필수)
    term2: false, // 고유식별정보 처리 동의 (필수)
  });

  // 전체 동의 상태
  const [isAllChecked, setIsAllChecked] = useState(false);

  // 개별 체크 변경
  const handleCheck = (key) => {
    setAgreements((prev) => {
      const newState = { ...prev, [key]: !prev[key] };
      setIsAllChecked(Object.values(newState).every(val => val));
      return newState;
    });
  };

  // 전체 동의 클릭
  const handleAllCheck = () => {
    const newValue = !isAllChecked;
    setIsAllChecked(newValue);
    setAgreements({
      term1: newValue,
      term2: newValue,
    });
  };

  // 필수 항목 체크 여부 확인
  const isValid = agreements.term1 && agreements.term2;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* 21인치 전용 클래스: privacy-consent-modal-xl */}
      <div className="modal-content privacy-consent-modal-xl" onClick={(e) => e.stopPropagation()}>
        
        <h2 className="privacy-header-title-xl">{t('privacy_consent_title')}</h2>

        <div className="privacy-inner-box-xl">
          <p className="privacy-guide-text-xl">
            {t('privacy_consent_desc')}
          </p>

          <hr className="privacy-divider-xl" />

          {/* 전체 동의 버튼 (초대형) */}
          <div className="privacy-check-row-xl all-agree-row" onClick={handleAllCheck}>
            <span className="check-label-xl">{t('privacy_consent_all')}</span>
            {/* 체크박스 클래스: custom-checkbox-xl */}
            <div className={`custom-checkbox-xl ${isAllChecked ? 'checked' : ''}`} />
          </div>

          <div className="spacer-xl"></div>

          {/* 약관 1 */}
          <div className="privacy-check-row-xl" onClick={() => handleCheck('term1')}>
            <span className="check-label-xl">{t('privacy_term1_label')}</span>
            <div className={`custom-checkbox-xl ${agreements.term1 ? 'checked' : ''}`} />
          </div>
          <p className="privacy-sub-text-xl">
            {t('privacy_term1_detail')}
          </p>

          {/* 약관 2 */}
          <div className="privacy-check-row-xl" onClick={() => handleCheck('term2')}>
            <span className="check-label-xl">{t('privacy_term2_label')}</span>
            <div className={`custom-checkbox-xl ${agreements.term2 ? 'checked' : ''}`} />
          </div>
          <p className="privacy-sub-text-xl">
            {t('privacy_term2_detail')}
          </p>
        </div>

        {/* 하단 버튼 그룹 (초대형) */}
        <div className="privacy-btn-group-xl">
          <button 
            className="privacy-action-btn-xl btn-agree-blue" 
            onClick={onConfirm} 
            disabled={!isValid}
            style={{ opacity: isValid ? 1 : 0.5, cursor: isValid ? 'pointer' : 'not-allowed' }}
          >
            {t('btn_agree_and_auth')}
          </button>
          <button className="privacy-action-btn-xl btn-cancel-green" onClick={onClose}>
            {t('btn_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsentModal;