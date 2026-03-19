// src/mainPage/modals/PrivacyModal.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const PrivacyModal = ({
  onClose,
  onAgree,
  agreements,
  toggleAgreement,
  openFullText,
}) => {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content privacy-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="privacy-header-title">{t('privacy_modal_title')}</h2>

        <div className="privacy-inner-box">
          <p className="privacy-top-desc">
            {t('privacy_modal_desc').split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
          </p>
          <hr className="privacy-divider" />

          <div className="privacy-section">
            <div className="privacy-sec-header">
              <span className="privacy-req-badge">{t('privacy_req_label')}</span>
              <button className="privacy-view-btn" onClick={() => openFullText('required')}>{t('privacy_view_full')}</button>
            </div>
            <ul className="privacy-list">
              {t('privacy_req_items').split('\n').map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <hr className="privacy-light-divider" />
          <div className="privacy-check-row" onClick={() => toggleAgreement('required')}>
            <span>{t('privacy_agree_check')}</span>
            <div className={`custom-checkbox ${agreements.required ? 'checked' : ''}`}></div>
          </div>

          <div className="privacy-section" style={{ marginTop: '20px' }}>
            <div className="privacy-sec-header">
              <span className="privacy-opt-badge">{t('privacy_opt_label')}</span>
              <button className="privacy-view-btn" onClick={() => openFullText('optional')}>{t('privacy_view_full')}</button>
            </div>
          </div>
          <div className="privacy-check-row" onClick={() => toggleAgreement('optional')}>
            <span>{t('privacy_agree_check')}</span>
            <div className={`custom-checkbox ${agreements.optional ? 'checked' : ''}`}></div>
          </div>
        </div>

        <div className="privacy-btn-group">
          <button className="privacy-action-btn btn-agree-blue" onClick={onAgree}>
            {t('btn_agree')}
          </button>
          <button className="privacy-action-btn btn-cancel-green" onClick={onClose}>
            {t('btn_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
