import React from 'react';
import { useTranslation } from 'react-i18next';
import './GuideFaqModal.css'; 

const GuideFaqModal = ({ onClose }) => {
  const { t } = useTranslation();
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content-faq">
        <header className="modal-header-custom">
          <div className="close-btn-wrapper" onClick={onClose}>
            <span className="close-text">{t('btn_close', '닫기')}</span>
            <div className="close-icon-circle">×</div>
          </div>
        </header>
        <hr className="blue-divider" />

        <div className="modal-body-custom">
          <div className="faq-list-container">
            {/* Q1 */}
            <div className="faq-item">
              <div className="faq-row">
                <div className="faq-icon q-icon">Q</div>
                <div className="faq-text q-text">{t('faq_q1')}</div>
              </div>
              <div className="faq-row">
                <div className="faq-icon a-icon">A</div>
                <div className="faq-text a-text">{t('faq_a1')}</div>
              </div>
            </div>
            <hr className="faq-divider" />
            
            {/* Q2 */}
            <div className="faq-item">
              <div className="faq-row">
                <div className="faq-icon q-icon">Q</div>
                <div className="faq-text q-text">{t('faq_q2')}</div>
              </div>
              <div className="faq-row">
                <div className="faq-icon a-icon">A</div>
                <div className="faq-text a-text">
                  {t('faq_a2')}
                  {(t('faq_a2_strong') || t('faq_a2_sub')) && (
                    <>
                      <br /><span className="highlight-text">{t('faq_a2_strong') || t('faq_a2_sub')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <hr className="faq-divider" />

            {/* Q3 */}
            <div className="faq-item">
              <div className="faq-row">
                <div className="faq-icon q-icon">Q</div>
                <div className="faq-text q-text">{t('faq_q3')}</div>
              </div>
              <div className="faq-row">
                <div className="faq-icon a-icon">A</div>
                <div className="faq-text a-text">
                  {t('faq_a3')}
                  {t('faq_a3_strong') && (
                    <>
                      <br /><span className="highlight-text">{t('faq_a3_strong')}</span>
                    </>
                  )}
                </div>
              </div>
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

export default GuideFaqModal;